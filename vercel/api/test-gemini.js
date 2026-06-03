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

  const key =
    process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY;
  if (!key) {
    return res
      .status(400)
      .json({ ok: false, message: 'GEMINI_API_KEY manquante dans Vercel.' });
  }

  try {
    const response = await requestWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond only with OK' }] }],
        }),
      },
    );
    const data = await response.json();
    if (!response.ok || !data.candidates) {
      return res.status(response.status || 502).json({
        ok: false,
        message: data?.error?.message || 'Reponse Gemini invalide.',
      });
    }
    return res.status(200).json({ ok: true, message: 'API Gemini OK' });
  } catch (error) {
    return res
      .status(502)
      .json({ ok: false, message: error.message || 'Test Gemini impossible.' });
  }
};
