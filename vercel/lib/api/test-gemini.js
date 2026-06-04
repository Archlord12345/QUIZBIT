const { getEnv } = require('../env');

const requestWithTimeout = async (url, options = {}, timeoutMs = 9000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const key = getEnv('GEMINI_API_KEY', 'REACT_APP_GEMINI_API_KEY');
  if (!key) {
    return res.status(400).json({
      ok: false,
      message: 'GEMINI_API_KEY manquante dans Vercel.',
    });
  }

  try {
    const models = [
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro-latest',
    ];
    const errors = [];

    for (const model of models) {
      const response = await requestWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Respond only with OK' }] }],
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.candidates) {
        return res.status(200).json({
          ok: true,
          message: `API Gemini OK (${model})`,
        });
      }
      const message =
        data?.error?.message || `${model}: HTTP ${response.status}`;
      if (response.status === 429 || /quota|rate/i.test(message)) {
        return res.status(200).json({
          ok: true,
          message: `Gemini joignable (${model}), quota a verifier`,
        });
      }
      errors.push(message);
    }

    return res.status(502).json({
      ok: false,
      message: errors[0] || 'Aucun modele Gemini compatible.',
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      message: error.message || 'Test Gemini impossible.',
    });
  }
};
