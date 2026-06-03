const { getEnv } = require('./env');

const requestWithTimeout = async (url, options = {}, timeoutMs = 15000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const models = [
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro-latest',
];
const getKey = () => getEnv('GEMINI_API_KEY', 'REACT_APP_GEMINI_API_KEY');

const parseQuestionsJson = text => {
  const clean = String(text || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  const start = clean.indexOf('[');
  const end = clean.lastIndexOf(']');
  if (start === -1 || end === -1)
    throw new Error('Gemini n a pas retourne de tableau JSON.');
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

const generateQuestions = async (prompt, count = 5) => {
  const key = getKey();
  if (!key) throw new Error('GEMINI_API_KEY manquante dans Vercel.');
  const cleanPrompt = String(prompt || '').trim();
  if (!cleanPrompt) throw new Error('Prompt requis.');
  const safeCount = Math.max(1, Math.min(20, Number(count || 5)));
  const geminiPrompt = [
    `Genere ${safeCount} questions de quiz en francais pour ce prompt: "${cleanPrompt}".`,
    'Reponds uniquement avec un tableau JSON valide, sans markdown.',
    'Types autorises:',
    'mcq: choix multiples avec options de 2 a 5 choix maximum, answer doit correspondre exactement a une option.',
    'open: reponse ouverte sans options, answer contient la reponse attendue.',
    'Schema: [{"id":"1","text":"Question","options":["A","B","C"],"answer":"A","type":"mcq"},{"id":"2","text":"Question ouverte","answer":"Reponse attendue","type":"open"}].',
  ].join(' ');
  const errors = [];
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
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const questions = parseQuestionsJson(text)
        .map(normalizeQuestion)
        .filter(Boolean)
        .slice(0, safeCount);
      if (!questions.length)
        throw new Error('Aucune question exploitable dans la reponse Gemini.');
      return { model, questions };
    }
    const message = data?.error?.message || `${model}: HTTP ${response.status}`;
    errors.push(message);
    if (response.status === 429 || /quota|rate/i.test(message)) break;
  }
  throw new Error(errors[0] || 'Generation Gemini impossible.');
};

const normalizeAnswer = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const validateAnswer = async (userAnswer, correctAnswer) => {
  if (normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer))
    return true;
  const key = getKey();
  if (!key) return false;
  for (const model of models) {
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
    if (response.ok) {
      const text = String(
        data?.candidates?.[0]?.content?.parts?.[0]?.text || '',
      );
      return normalizeAnswer(text).startsWith('oui');
    }
  }
  return false;
};

module.exports = { generateQuestions, validateAnswer };
