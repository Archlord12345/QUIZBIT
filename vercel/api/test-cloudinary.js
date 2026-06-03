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

  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  const uploadPreset =
    process.env.CLOUDINARY_UPLOAD_PRESET ||
    process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    return res.status(400).json({
      ok: false,
      message: 'CLOUDINARY_CLOUD_NAME et CLOUDINARY_UPLOAD_PRESET sont requis.',
    });
  }

  try {
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
      return res
        .status(200)
        .json({ ok: true, message: 'Cloudinary joignable, preset reconnu.' });
    }

    if (!response.ok) {
      return res.status(response.status || 502).json({
        ok: false,
        message: data?.error?.message || `Cloudinary HTTP ${response.status}`,
      });
    }

    return res.status(200).json({ ok: true, message: 'Cloudinary OK' });
  } catch (error) {
    return res
      .status(502)
      .json({
        ok: false,
        message: error.message || 'Test Cloudinary impossible.',
      });
  }
};
