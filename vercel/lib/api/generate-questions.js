const { getEnv } = require('../env');
const { verifyIdToken } = require('../auth-verify');

const requestWithTimeout = async (url, options = {}, timeoutMs = 15000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const toErrorMessage = error =>
  error?.message || (typeof error === 'string' ? error : 'Erreur inconnue.');

const parseQuestionsJson = (text, providerLabel) => {
  const clean = String(text || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.questions)) return parsed.questions;
  } catch {
    // Some models still wrap valid JSON in explanatory text; try extracting the array.
  }

  const start = clean.indexOf('[');
  const end = clean.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`${providerLabel} n a pas retourne de tableau JSON.`);
  }
  return JSON.parse(clean.slice(start, end + 1));
};

const normalizeQuestion = (item, index, config = {}) => {
  if (!item || typeof item !== 'object') return null;
  const text = String(item.text || '').trim();
  const answer = String(item.answer || '').trim();
  const requestedType = item.type === 'open' ? 'open' : 'mcq';
  const requestedQuestionType = config.questionType || 'mixed';
  const choiceCount = Math.max(2, Math.min(5, Number(config.choiceCount || 4)));
  const exactAnswer = config.openAnswerMode === 'exact';
  const rawOptions = Array.isArray(item.options)
    ? item.options.map(option => String(option).trim()).filter(Boolean)
    : [];

  if (!text || !answer) return null;

  if (requestedQuestionType === 'mcq' && (requestedType === 'open' || rawOptions.length < 2)) {
    return null;
  }

  if (requestedQuestionType === 'open' || requestedType === 'open' || rawOptions.length < 2) {
    return {
      id: String(item.id || `open-${index + 1}`),
      text,
      answer,
      exactAnswer,
      type: 'open',
    };
  }

  const options = rawOptions.includes(answer)
    ? rawOptions
    : [answer, ...rawOptions.filter(option => option !== answer)];

  return {
    id: String(item.id || `mcq-${index + 1}`),
    text,
    answer,
    options: options.slice(0, choiceCount),
    type: 'mcq',
  };
};

const normalizeQuestions = (text, count, providerLabel, options = {}) => {
  const questions = parseQuestionsJson(text, providerLabel)
    .map((item, index) => normalizeQuestion(item, index, options))
    .filter(Boolean)
    .slice(0, count);

  if (!questions.length) {
    throw new Error(`Aucune question exploitable dans la reponse ${providerLabel}.`);
  }

  return questions;
};

const normalizeGenerationOptions = body => {
  const questionType = ['mcq', 'open', 'mixed'].includes(body.questionType)
    ? body.questionType
    : 'mixed';
  return {
    questionType,
    choiceCount: Math.max(2, Math.min(5, Number(body.choiceCount || 4))),
    openAnswerMode: body.openAnswerMode === 'exact' ? 'exact' : 'flexible',
  };
};

const buildPrompt = (prompt, count, mode = 'array', options = {}) => {
  const questionType = options.questionType || 'mixed';
  const choiceCount = Math.max(2, Math.min(5, Number(options.choiceCount || 4)));
  const exactAnswer = options.openAnswerMode === 'exact';
  const schema =
    mode === 'object'
      ? '{"questions":[{"id":"1","text":"Question","options":["A","B","C"],"answer":"A","type":"mcq"},{"id":"2","text":"Question ouverte","answer":"Reponse attendue","type":"open","exactAnswer":false}]}'
      : '[{"id":"1","text":"Question","options":["A","B","C"],"answer":"A","type":"mcq"},{"id":"2","text":"Question ouverte","answer":"Reponse attendue","type":"open","exactAnswer":false}]';

  const typeInstruction =
    questionType === 'mcq'
      ? `Genere uniquement des QCM. Chaque question doit contenir exactement ${choiceCount} options distinctes et answer doit correspondre exactement a une option.`
      : questionType === 'open'
      ? `Genere uniquement des questions a reponse ouverte. N ajoute jamais options. exactAnswer doit valoir ${exactAnswer ? 'true' : 'false'}.`
      : `Melange QCM et questions ouvertes quand le theme le permet. Les QCM doivent avoir exactement ${choiceCount} options.`;

  return [
    `Genere ${count} questions de quiz en francais pour ce prompt: "${prompt}".`,
    mode === 'object'
      ? 'Reponds uniquement avec un objet JSON valide, sans markdown, contenant la cle questions.'
      : 'Reponds uniquement avec un tableau JSON valide, sans markdown.',
    typeInstruction,
    'Types autorises:',
    `mcq: choix multiples avec exactement ${choiceCount} options maximum 5, answer doit correspondre exactement a une option.`,
    exactAnswer
      ? 'open: reponse ouverte sans options, answer contient un nom/terme exact attendu; l orthographe doit etre stricte.'
      : 'open: reponse ouverte sans options, answer contient la reponse attendue; les synonymes et petites fautes pourront etre acceptes a la correction.',
    `Schema: ${schema}.`,
  ].join(' ');
};

const generateWithGemini = async (prompt, count, options = {}) => {
  const key = getEnv('GEMINI_API_KEY', 'REACT_APP_GEMINI_API_KEY');
  if (!key) {
    throw new Error('GEMINI_API_KEY manquante dans Vercel.');
  }

  const models = [
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
  ];
  const errors = [];
  const geminiPrompt = buildPrompt(prompt, count, 'array', options);

  for (const model of models) {
    const response = await requestWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: geminiPrompt }] }],
        }),
      },
    );
    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      try {
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return {
          provider: 'gemini',
          model,
          questions: normalizeQuestions(text, count, 'Gemini', options),
        };
      } catch (error) {
        errors.push(`${model}: ${toErrorMessage(error)}`);
        continue;
      }
    }

    const message = data?.error?.message || `${model}: HTTP ${response.status}`;
    errors.push(message);
    if (response.status === 429 || /quota|rate/i.test(message)) break;
  }

  throw new Error(errors[0] || 'Generation Gemini impossible.');
};

const mistralTextFromResponse = data => {
  const content = data?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    return content
      .map(part => (typeof part === 'string' ? part : part?.text || ''))
      .join('\n');
  }
  return String(content || '');
};

const generateWithMistral = async (prompt, count, options = {}) => {
  const key = getEnv('MISTRAL_API_KEY', 'REACT_APP_MISTRAL_API_KEY');
  if (!key) {
    throw new Error('MISTRAL_API_KEY manquante dans Vercel.');
  }

  const models = ['mistral-small-latest', 'open-mistral-nemo', 'mistral-large-latest'];
  const errors = [];
  const mistralPrompt = buildPrompt(prompt, count, 'object', options);

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
              content:
                'Tu es un generateur de quiz. Tu reponds uniquement avec du JSON valide.',
            },
            { role: 'user', content: mistralPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 2400,
        }),
      },
    );
    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      try {
        return {
          provider: 'mistral',
          model,
          questions: normalizeQuestions(mistralTextFromResponse(data), count, 'Mistral', options),
        };
      } catch (error) {
        errors.push(`${model}: ${toErrorMessage(error)}`);
        continue;
      }
    }

    const message =
      data?.message || data?.error?.message || `${model}: HTTP ${response.status}`;
    errors.push(message);
    if (response.status === 429 || /quota|rate/i.test(message)) break;
  }

  throw new Error(errors[0] || 'Generation Mistral impossible.');
};

const generateQuestions = async (prompt, count, provider, options = {}) => {
  if (provider === 'gemini') return generateWithGemini(prompt, count, options);
  if (provider === 'mistral') return generateWithMistral(prompt, count, options);

  try {
    return await generateWithGemini(prompt, count, options);
  } catch (geminiError) {
    try {
      const fallback = await generateWithMistral(prompt, count, options);
      return {
        ...fallback,
        fallbackFrom: 'gemini',
        fallbackReason: toErrorMessage(geminiError),
      };
    } catch (mistralError) {
      throw new Error(
        `Gemini: ${toErrorMessage(geminiError)} | Mistral: ${toErrorMessage(mistralError)}`,
      );
    }
  }
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const prompt = String(body.prompt || body.theme || '').trim();
  const count = Math.max(1, Math.min(20, Number(body.count || 5)));
  const provider = ['gemini', 'mistral'].includes(body.provider)
    ? body.provider
    : 'auto';
  const generationOptions = normalizeGenerationOptions(body);

  if (!prompt) {
    return res.status(400).json({ ok: false, message: 'Prompt requis.' });
  }

  const idToken = String(body.idToken || '').trim();
  if (!idToken) {
    return res.status(401).json({
      ok: false,
      message: 'Connexion requise pour generer des questions.',
    });
  }

  try {
    await verifyIdToken(idToken);
    const result = await generateQuestions(prompt, count, provider, generationOptions);
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      provider,
      message: toErrorMessage(error),
    });
  }
};
