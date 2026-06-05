const { uploadImageBase64 } = require('../cloudinary-client');
const { verifyIdToken } = require('../auth-verify');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const { idToken, imageBase64, mimeType } = req.body || {};
  if (!idToken || !imageBase64) {
    return res.status(400).json({
      ok: false,
      message: 'idToken et imageBase64 requis.',
    });
  }

  try {
    await verifyIdToken(idToken);
    const result = await uploadImageBase64({
      imageBase64,
      mimeType: String(mimeType || 'image/jpeg'),
    });
    return res.status(200).json({
      ok: true,
      url: result.url,
      publicId: result.publicId,
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: error.message || 'Upload Cloudinary impossible.',
    });
  }
};
