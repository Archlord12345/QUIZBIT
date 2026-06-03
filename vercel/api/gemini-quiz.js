const { getEnv } = require('./env');

const requestWithTimeout = async (url, options = {}, timeoutMs = 20000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const geminiModels = [
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro-latest',
];
const mistralModels = ['mistral-small-latest', 'mistral-large-latest'];

const getGeminiKey = () => getEnv('GEMINI_API_KEY', 'REACT_APP_GEMINI_API_KEY');
const getMistralKey = () =>
  getEnv('MISTRAL_API_KEY', 'REACT_APP_MISTRAL_API_KEY');

const parseQuestionsJson = text => {
  const clean = String(text || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  const start = clean.indexOf('[');
  const end = clean.lastIndexOf(']');
  if (start === -1 || end === -1)
    throw new Error('Le modele IA n a pas retourne de tableau JSON.');
  return JSON.parse(clean.slice(start, end + 1));
};

const normalizeQuestion = (item, index) => {
  if (!item || typeof item !== 'object') return null;
  const text = String(item.text || '').trim();
  const answer = String(item.answer || '').trim();
  const requestedType = item.type === 'open' ? 'open' : 'mcq';
  const rawOptions = Array.isArray(item.options)
    ? item.options.map(option => String(option).trim()).filter(Boolean)
    : [];
  if (!text || !answer) return null;
  if (requestedType === 'open' || rawOptions.length < 2)
    return {
      id: String(item.id || `open-${index + 1}`),
      text,
      answer,
      type: 'open',
    };
  const options = rawOptions.includes(answer)
    ? rawOptions
    : [answer, ...rawOptions.filter(option => option !== answer)];
  return {
    id: String(item.id || `mcq-${index + 1}`),
    text,
    answer,
    options: options.slice(0, 5),
    type: 'mcq',
  };
};

const buildQuestionPrompt = (prompt, count) =>
  [
    `Genere ${count} questions de quiz en francais pour ce prompt: "${prompt}".`,
    'Reponds uniquement avec un tableau JSON valide, sans markdown.',
    'Types autorises:',
    'mcq: choix multiples avec options de 2 a 5 choix maximum, answer doit correspondre exactement a une option.',
    'open: reponse ouverte sans options, answer contient la reponse attendue.',
    'Schema: [{"id":"1","text":"Question","options":["A","B","C"],"answer":"A","type":"mcq"},{"id":"2","text":"Question ouverte","answer":"Reponse attendue","type":"open"}].',
  ].join(' ');

const normalizeProvider = provider => {
  if (provider === 'gemini' || provider === 'mistral') return provider;
  return 'auto';
};

const providerOrder = provider => {
  const normalized = normalizeProvider(provider);
  if (normalized === 'mistral') return ['mistral', 'gemini'];
  return ['gemini', 'mistral'];
};

const parseGeneratedQuestions = (text, count) =>
  parseQuestionsJson(text)
    .map(normalizeQuestion)
    .filter(Boolean)
    .slice(0, count);

const generateWithGemini = async (prompt, count) => {
  const key = getGeminiKey();
  if (!key) throw new Error('GEMINI_API_KEY manquante dans Vercel.');
  const errors = [];
  for (const model of geminiModels) {
    const response = await requestWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildQuestionPrompt(prompt, count) }] }],
        }),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const questions = parseGeneratedQuestions(text, count);
      if (!questions.length)
        throw new Error('Aucune question exploitable dans la reponse Gemini.');
      return { provider: 'gemini', model, questions };
    }
    const message =
      data?.error?.message || `Gemini ${model}: HTTP ${response.status}`;
    errors.push(message);
    if (response.status === 429 || /quota|rate|exceeded|sature/i.test(message))
      break;
  }
  throw new Error(errors[0] || 'Generation Gemini impossible.');
};

const generateWithMistral = async (prompt, count) => {
  const key = getMistralKey();
  if (!key) throw new Error('MISTRAL_API_KEY manquante dans Vercel.');
  const errors = [];
  for (const model of mistralModels) {
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
          temperature: 0.4,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'Tu generes des quiz. Reponds uniquement en JSON avec une cle questions contenant un tableau.',
            },
            {
              role: 'user',
              content: `${buildQuestionPrompt(
                prompt,
                count,
              )} Retourne {"questions":[...]}.`,
            },
          ],
        }),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      const content = data?.choices?.[0]?.message?.content;
      const parsed = JSON.parse(String(content || '{}'));
      const source = Array.isArray(parsed) ? parsed : parsed.questions;
      const questions = source
        .map(normalizeQuestion)
        .filter(Boolean)
        .slice(0, count);
      if (!questions.length)
        throw new Error('Aucune question exploitable dans la reponse Mistral.');
      return { provider: 'mistral', model, questions };
    }
    const message =
      data?.message ||
      data?.error?.message ||
      `Mistral ${model}: HTTP ${response.status}`;
    errors.push(message);
    if (response.status === 429 || /quota|rate|exceeded|sature/i.test(message))
      break;
  }
  throw new Error(errors[0] || 'Generation Mistral impossible.');
};

const generateQuestions = async (prompt, count = 5, provider = 'auto') => {
  const cleanPrompt = String(prompt || '').trim();
  if (!cleanPrompt) throw new Error('Prompt requis.');
  const safeCount = Math.max(1, Math.min(20, Number(count || 5)));
  const errors = [];

  for (const currentProvider of providerOrder(provider)) {
    try {
      const result =
        currentProvider === 'mistral'
          ? await generateWithMistral(cleanPrompt, safeCount)
          : await generateWithGemini(cleanPrompt, safeCount);
      return {
        ...result,
        requestedProvider: normalizeProvider(provider),
        fallbackUsed:
          normalizeProvider(provider) !== 'auto' &&
          normalizeProvider(provider) !== result.provider,
      };
    } catch (error) {
      errors.push(`${currentProvider}: ${error.message}`);
    }
  }

  throw new Error(errors.join(' | ') || 'Generation IA impossible.');
};

const normalizeAnswer = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const validateWithGemini = async (userAnswer, correctAnswer) => {
  const key = getGeminiKey();
  if (!key) throw new Error('GEMINI_API_KEY manquante.');
  for (const model of geminiModels) {
    const response = await requestWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: [
                    'Tu verifies une reponse ouverte de quiz en francais.',
                    'Reponds uniquement par OUI ou NON.',
                    `Reponse attendue: ${correctAnswer}`,
                    `Reponse utilisateur: ${userAnswer}`,
                    'Accepte les synonymes et formulations equivalentes, refuse les contresens.',
                  ].join(' '),
                },
              ],
            },
          ],
        }),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (response.ok)
      return normalizeAnswer(
        String(data?.candidates?.[0]?.content?.parts?.[0]?.text || ''),
      ).startsWith('oui');
  }
  throw new Error('Validation Gemini impossible.');
};

const validateWithMistral = async (userAnswer, correctAnswer) => {
  const key = getMistralKey();
  if (!key) throw new Error('MISTRAL_API_KEY manquante.');
  for (const model of mistralModels) {
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
          temperature: 0,
          messages: [
            {
              role: 'system',
              content:
                'Tu verifies une reponse de quiz. Reponds uniquement OUI ou NON.',
            },
            {
              role: 'user',
              content: `Reponse attendue: ${correctAnswer}\nReponse utilisateur: ${userAnswer}`,
            },
          ],
        }),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (response.ok)
      return normalizeAnswer(
        String(data?.choices?.[0]?.message?.content || ''),
      ).startsWith('oui');
  }
  throw new Error('Validation Mistral impossible.');
};

const validateAnswer = async (userAnswer, correctAnswer, provider = 'auto') => {
  if (normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer))
    return true;
  for (const currentProvider of providerOrder(provider)) {
    try {
      return currentProvider === 'mistral'
        ? await validateWithMistral(userAnswer, correctAnswer)
        : await validateWithGemini(userAnswer, correctAnswer);
    } catch {
      // Try next provider.
    }
  }
  return false;
};

module.exports = { generateQuestions, validateAnswer };
