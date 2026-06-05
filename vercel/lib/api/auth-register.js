const { firebaseAuthRequest, setDocument } = require('../firebase-rest');
const { buildDefaultAvatarUrl } = require('../default-avatar');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const { displayName, email, password } = req.body || {};
  const cleanEmail = String(email || '')
    .trim()
    .toLowerCase();
  const cleanName =
    String(displayName || '').trim() || cleanEmail.split('@')[0] || 'Player';

  if (!cleanEmail.includes('@') || String(password || '').length < 6) {
    return res
      .status(400)
      .json({ ok: false, message: 'Email ou mot de passe invalide.' });
  }

  try {
    const auth = await firebaseAuthRequest('accounts:signUp', {
      email: cleanEmail,
      password,
      returnSecureToken: true,
    });

    await firebaseAuthRequest('accounts:update', {
      idToken: auth.idToken,
      displayName: cleanName,
      returnSecureToken: true,
    });

    const account = {
      id: auth.localId,
      email: cleanEmail,
      displayName: cleanName,
      avatarUrl: buildDefaultAvatarUrl(auth.localId, cleanName),
      gamesPlayed: 0,
      totalScore: 0,
      bestScore: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDocument('users', account.id, account, auth.idToken);
    return res
      .status(200)
      .json({ ok: true, account: { ...account, idToken: auth.idToken } });
  } catch (error) {
    return res
      .status(400)
      .json({ ok: false, message: error.message || 'Inscription impossible.' });
  }
};
