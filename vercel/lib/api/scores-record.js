const { addDocument, getDocument } = require('../firebase-rest');
const { assertAccountId, clampScore, verifyIdToken } = require('../auth-verify');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }
  const { account, idToken, mode, score, theme } = req.body || {};
  if (!idToken || !account?.id) {
    return res
      .status(400)
      .json({ ok: false, message: 'Compte authentifie requis.' });
  }
  try {
    const auth = await verifyIdToken(idToken);
    assertAccountId(account, auth.uid);
    const profile = await getDocument('users', auth.uid, idToken);
    const scoreEntry = {
      userId: auth.uid,
      displayName:
        profile?.displayName || account.displayName || auth.displayName || 'Player',
      theme: String(theme || '').trim().slice(0, 120),
      score: clampScore(score),
      mode: mode === 'battle_royale' ? 'battle_royale' : 'solo',
      createdAt: new Date().toISOString(),
    };
    const saved = await addDocument('scores', scoreEntry, idToken);
    return res.status(200).json({ ok: true, scoreEntry: saved });
  } catch (error) {
    return res
      .status(400)
      .json({
        ok: false,
        message: error.message || 'Sauvegarde score impossible.',
      });
  }
};
