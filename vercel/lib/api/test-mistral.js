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

  const key = getEnv('MISTRAL_API_KEY', 'REACT_APP_MISTRAL_API_KEY');
  if (!key) {
    return res
      .status(400)
      .json({ ok: false, message: 'MISTRAL_API_KEY manquante dans Vercel.' });
  }

  try {
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
            messages: [{ role: 'user', content: 'Respond only with OK' }],
            max_tokens: 8,
            temperature: 0,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        return res.status(200).json({
          ok: true,
          message: `API Mistral OK (${model})`,
        });
      }
      const message =
        data?.message || data?.error?.message || `${model}: HTTP ${response.status}`;
      if (response.status === 429 || /quota|rate/i.test(message)) {
        return res.status(200).json({
          ok: true,
          message: `Mistral joignable (${model}), quota a verifier`,
        });
      }
      errors.push(message);
    }

    return res.status(502).json({
      ok: false,
      message: errors[0] || 'Aucun modele Mistral compatible.',
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      message: error.message || 'Test Mistral impossible.',
    });
  }
};
