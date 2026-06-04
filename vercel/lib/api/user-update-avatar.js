const { getDocument, setDocument } = require('../firebase-rest');
const {
  assertUserId,
  isSafeAvatarUrl,
  verifyIdToken,
} = require('../auth-verify');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }
  const { avatarUrl, idToken, userId } = req.body || {};
  if (!idToken || !userId || !avatarUrl) {
    return res
      .status(400)
      .json({ ok: false, message: 'idToken, userId et avatarUrl requis.' });
  }
  if (!isSafeAvatarUrl(avatarUrl)) {
    return res.status(400).json({
      ok: false,
      message: 'URL avatar invalide. Utilise un upload Cloudinary HTTPS.',
    });
  }
  try {
    const auth = await verifyIdToken(idToken);
    assertUserId(userId, auth.uid);
    const current = await getDocument('users', auth.uid, idToken);
    if (!current) throw new Error('Profil utilisateur introuvable.');
    const account = {
      ...current,
      avatarUrl,
      updatedAt: new Date().toISOString(),
    };
    await setDocument('users', auth.uid, account, idToken);
    return res.status(200).json({ ok: true, account: { ...account, idToken } });
  } catch (error) {
    return res
      .status(400)
      .json({
        ok: false,
        message: error.message || 'Mise a jour avatar impossible.',
      });
  }
};
