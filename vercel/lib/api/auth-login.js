const {
  firebaseAuthRequest,
  getDocument,
  setDocument,
} = require('../firebase-rest');
const { buildDefaultAvatarUrl } = require('../default-avatar');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const { email, password } = req.body || {};
  const cleanEmail = String(email || '')
    .trim()
    .toLowerCase();
  if (!cleanEmail.includes('@') || String(password || '').length < 6) {
    return res
      .status(400)
      .json({ ok: false, message: 'Email ou mot de passe invalide.' });
  }

  try {
    const auth = await firebaseAuthRequest('accounts:signInWithPassword', {
      email: cleanEmail,
      password,
      returnSecureToken: true,
    });
    let account = await getDocument('users', auth.localId, auth.idToken);
    if (!account) {
      const displayName =
        auth.displayName || cleanEmail.split('@')[0] || 'Player';
      account = {
        id: auth.localId,
        email: cleanEmail,
        displayName,
        avatarUrl: buildDefaultAvatarUrl(auth.localId, displayName),
        gamesPlayed: 0,
        totalScore: 0,
        bestScore: 0,
        cups: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDocument('users', account.id, account, auth.idToken);
    } else if (!String(account.avatarUrl || '').trim()) {
      account = {
        ...account,
        avatarUrl: buildDefaultAvatarUrl(account.id, account.displayName),
        updatedAt: new Date().toISOString(),
      };
      await setDocument('users', account.id, account, auth.idToken);
    }
    return res
      .status(200)
      .json({ ok: true, account: { ...account, idToken: auth.idToken } });
  } catch (error) {
    return res
      .status(400)
      .json({ ok: false, message: error.message || 'Connexion impossible.' });
  }
};
