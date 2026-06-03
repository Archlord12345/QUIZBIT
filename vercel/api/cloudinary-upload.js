const crypto = require('crypto');
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

const signParams = (params, secret) => {
  const payload = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(`${payload}${secret}`).digest('hex');
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const { uri } = req.body || {};
  const cleanUri = String(uri || '').trim();
  if (!cleanUri)
    return res.status(400).json({ ok: false, message: 'URI image manquante.' });
  if (!/^https?:\/\//i.test(cleanUri)) {
    return res
      .status(400)
      .json({
        ok: false,
        message:
          'Pour un upload serveur Cloudinary, fournis une URL image https accessible publiquement.',
      });
  }

  const cloudName = getEnv(
    'CLOUDINARY_CLOUD_NAME',
    'REACT_APP_CLOUDINARY_CLOUD_NAME',
  );
  const apiKey = getEnv('CLOUDINARY_API_KEY');
  const apiSecret = getEnv('CLOUDINARY_API_SECRET');
  if (!cloudName || !apiKey || !apiSecret) {
    return res
      .status(400)
      .json({
        ok: false,
        message: 'Configuration Cloudinary serveur manquante.',
      });
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const params = { folder: 'quizbit/avatars', timestamp };
    const signature = signParams(params, apiSecret);
    const formData = new FormData();
    formData.append('file', cleanUri);
    formData.append('folder', params.folder);
    formData.append('timestamp', String(timestamp));
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    const response = await requestWithTimeout(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.secure_url) {
      return res
        .status(response.status || 502)
        .json({
          ok: false,
          message: data?.error?.message || `Cloudinary HTTP ${response.status}`,
        });
    }
    return res
      .status(200)
      .json({
        ok: true,
        upload: { url: data.secure_url, publicId: data.public_id },
      });
  } catch (error) {
    return res
      .status(502)
      .json({
        ok: false,
        message: error.message || 'Upload Cloudinary impossible.',
      });
  }
};
