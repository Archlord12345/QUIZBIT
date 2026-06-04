const { getEnv } = require('../env');

const requestWithTimeout = async (url, options = {}, timeoutMs = 15000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const parseQuestionsJson = text => {
  const clean = String(text || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  const start = clean.indexOf('[');
  const end = clean.lastIndexOf(']');
  if (start === -1 || end === -1) {
    throw new Error('Gemini n a pas retourne de tableau JSON.');
  }
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

  if (requestedType === 'open' || rawOptions.length < 2) {
    return {
      id: String(item.id || `open-${index + 1}`),
      text,
      answer,
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
    options: options.slice(0, 5),
    type: 'mcq',
  };
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const key = getEnv('GEMINI_API_KEY', 'REACT_APP_GEMINI_API_KEY');
  if (!key) {
    return res.status(400).json({
      ok: false,
      message: 'GEMINI_API_KEY manquante dans Vercel.',
    });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const prompt = String(body.prompt || body.theme || '').trim();
  const count = Math.max(1, Math.min(20, Number(body.count || 5)));

  if (!prompt) {
    return res.status(400).json({ ok: false, message: 'Prompt requis.' });
  }

  const geminiPrompt = [
    `Genere ${count} questions de quiz en francais pour ce prompt: "${prompt}".`,
    'Reponds uniquement avec un tableau JSON valide, sans markdown.',
    'Types autorises:',
    'mcq: choix multiples avec options de 2 a 5 choix maximum, answer doit correspondre exactement a une option.',
    'open: reponse ouverte sans options, answer contient la reponse attendue.',
    'Schema: [{"id":"1","text":"Question","options":["A","B","C"],"answer":"A","type":"mcq"},{"id":"2","text":"Question ouverte","answer":"Reponse attendue","type":"open"}].',
  ].join(' ');

  const models = [
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
  ];
  const errors = [];

  try {
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
          .slice(0, count);
        if (!questions.length) {
          throw new Error(
            'Aucune question exploitable dans la reponse Gemini.',
          );
        }
        return res.status(200).json({ ok: true, model, questions });
      }
      const message =
        data?.error?.message || `${model}: HTTP ${response.status}`;
      errors.push(message);
      if (response.status === 429 || /quota|rate/i.test(message)) break;
    }

    return res.status(502).json({
      ok: false,
      message: errors[0] || 'Generation Gemini impossible.',
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      message: error.message || 'Generation Gemini impossible.',
    });
  }
};
