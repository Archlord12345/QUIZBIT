const { getEnv } = require('./env');

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

  const cloudName = getEnv(
    'CLOUDINARY_CLOUD_NAME',
    'REACT_APP_CLOUDINARY_CLOUD_NAME',
  );
  const uploadPreset = getEnv('CLOUDINARY_UPLOAD_PRESET');
  const apiKey = getEnv('CLOUDINARY_API_KEY');
  const apiSecret = getEnv('CLOUDINARY_API_SECRET');

  if (!cloudName) {
    return res.status(400).json({
      ok: false,
      message: 'CLOUDINARY_CLOUD_NAME est requis.',
    });
  }

  try {
    if (apiKey && apiSecret) {
      const basicAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString(
        'base64',
      );
      const response = await requestWithTimeout(
        `https://api.cloudinary.com/v1_1/${cloudName}/usage`,
        {
          headers: {
            Authorization: `Basic ${basicAuth}`,
          },
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return res.status(response.status || 502).json({
          ok: false,
          message: data?.error?.message || `Cloudinary HTTP ${response.status}`,
        });
      }
      return res.status(200).json({
        ok: true,
        message: `Cloudinary OK (${cloudName})`,
      });
    }

    if (!uploadPreset) {
      return res.status(400).json({
        ok: false,
        message:
          'CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET ou CLOUDINARY_UPLOAD_PRESET sont requis.',
      });
    }

    const formData = new FormData();
    formData.append('upload_preset', uploadPreset);
    const response = await requestWithTimeout(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: formData },
    );
    const data = await response.json().catch(() => ({}));

    if (
      response.status === 400 &&
      /file/i.test(String(data?.error?.message || ''))
    ) {
      return res.status(200).json({
        ok: true,
        message: `Cloudinary joignable (${cloudName}), preset reconnu.`,
      });
    }

    if (!response.ok) {
      return res.status(response.status || 502).json({
        ok: false,
        message: data?.error?.message || `Cloudinary HTTP ${response.status}`,
      });
    }

    return res
      .status(200)
      .json({ ok: true, message: `Cloudinary OK (${cloudName})` });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      message: error.message || 'Test Cloudinary impossible.',
    });
  }
};
