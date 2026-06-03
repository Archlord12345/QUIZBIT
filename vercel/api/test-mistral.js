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
    process.env.MISTRAL_API_KEY || process.env.REACT_APP_MISTRAL_API_KEY;
  if (!key) {
    return res
      .status(400)
      .json({ ok: false, message: 'MISTRAL_API_KEY manquante dans Vercel.' });
  }

  try {
    const response = await requestWithTimeout(
      'https://api.mistral.ai/v1/models',
      {
        headers: { Authorization: `Bearer ${key}` },
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status || 502).json({
        ok: false,
        message:
          data?.message ||
          data?.error?.message ||
          `Mistral HTTP ${response.status}`,
      });
    }
    return res.status(200).json({ ok: true, message: 'API Mistral OK' });
  } catch (error) {
    return res
      .status(502)
      .json({
        ok: false,
        message: error.message || 'Test Mistral impossible.',
      });
  }
};
