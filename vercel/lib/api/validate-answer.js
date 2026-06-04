const { getEnv } = require('../env');

const requestWithTimeout = async (url, options = {}, timeoutMs = 12000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const normalizeFlexible = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeExact = value =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const toErrorMessage = error =>
  error?.message || (typeof error === 'string' ? error : 'Erreur inconnue.');

const readGeminiText = data =>
  String(data?.candidates?.[0]?.content?.parts?.[0]?.text || '');

const readMistralText = data => {
  const content = data?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    return content
      .map(part => (typeof part === 'string' ? part : part?.text || ''))
      .join('\n');
  }
  return String(content || '');
};

const isYes = text => normalizeFlexible(text).startsWith('oui');

const buildValidationPrompt = ({ correctAnswer, questionText, userAnswer }) =>
  [
    'Tu corriges une reponse ouverte de quiz en francais.',
    'Reponds uniquement par OUI ou NON.',
    'Accepte les synonymes, formulations equivalentes et petites fautes d orthographe.',
    'Refuse les contresens, les reponses trop vagues et les mauvaises personnes/lieux/dates.',
    `Question: ${questionText || 'Non fournie'}`,
    `Reponse attendue: ${correctAnswer}`,
    `Reponse utilisateur: ${userAnswer}`,
  ].join(' ');

const validateWithGemini = async payload => {
  const key = getEnv('GEMINI_API_KEY', 'REACT_APP_GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY manquante dans Vercel.');

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash-latest'];
  const errors = [];
  for (const model of models) {
    const response = await requestWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildValidationPrompt(payload) }] }],
        }),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      return { correct: isYes(readGeminiText(data)), model, provider: 'gemini' };
    }
    const message = data?.error?.message || `${model}: HTTP ${response.status}`;
    errors.push(message);
    if (response.status === 429 || /quota|rate/i.test(message)) break;
  }
  throw new Error(errors[0] || 'Validation Gemini impossible.');
};

const validateWithMistral = async payload => {
  const key = getEnv('MISTRAL_API_KEY', 'REACT_APP_MISTRAL_API_KEY');
  if (!key) throw new Error('MISTRAL_API_KEY manquante dans Vercel.');

  const models = ['mistral-small-latest', 'open-mistral-nemo'];
  const errors = [];
  for (const model of models) {
    const response = await requestWithTimeout(
      'https://api.mistral.ai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'Tu corriges un quiz. Reponds uniquement par OUI ou NON.',
            },
            { role: 'user', content: buildValidationPrompt(payload) },
          ],
          temperature: 0,
          max_tokens: 8,
        }),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      return { correct: isYes(readMistralText(data)), model, provider: 'mistral' };
    }
    const message =
      data?.message || data?.error?.message || `${model}: HTTP ${response.status}`;
    errors.push(message);
    if (response.status === 429 || /quota|rate/i.test(message)) break;
  }
  throw new Error(errors[0] || 'Validation Mistral impossible.');
};

const validateFlexible = async payload => {
  try {
    return await validateWithGemini(payload);
  } catch (geminiError) {
    const fallback = await validateWithMistral(payload);
    return {
      ...fallback,
      fallbackFrom: 'gemini',
      fallbackReason: toErrorMessage(geminiError),
    };
  }
};

const { verifyIdToken } = require('../auth-verify');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const idToken = String(body.idToken || '').trim();
  if (!idToken) {
    return res.status(401).json({
      ok: false,
      message: 'Connexion requise pour valider une reponse.',
    });
  }

  const userAnswer = String(body.userAnswer || '').trim();
  const correctAnswer = String(body.correctAnswer || '').trim();
  const exact = Boolean(body.exactAnswer);

  if (!userAnswer || !correctAnswer) {
    return res.status(400).json({
      ok: false,
      message: 'userAnswer et correctAnswer sont requis.',
    });
  }

  try {
    await verifyIdToken(idToken);
  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: error.message || 'Session invalide.',
    });
  }

  if (exact) {
    return res.status(200).json({
      ok: true,
      correct: normalizeExact(userAnswer) === normalizeExact(correctAnswer),
      mode: 'exact',
      provider: 'local',
    });
  }

  if (normalizeFlexible(userAnswer) === normalizeFlexible(correctAnswer)) {
    return res.status(200).json({
      ok: true,
      correct: true,
      mode: 'flexible',
      provider: 'local',
    });
  }

  try {
    const result = await validateFlexible({
      correctAnswer,
      questionText: String(body.questionText || ''),
      userAnswer,
    });
    return res.status(200).json({ ok: true, mode: 'flexible', ...result });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      message: toErrorMessage(error),
    });
  }
};
