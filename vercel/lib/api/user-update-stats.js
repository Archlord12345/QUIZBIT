const { getDocument, setDocument } = require('../firebase-rest');
const { assertUserId, clampScore, verifyIdToken } = require('../auth-verify');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }
  const { awardCup, idToken, score, userId } = req.body || {};
  if (!idToken || !userId) {
    return res
      .status(400)
      .json({ ok: false, message: 'idToken et userId requis.' });
  }
  try {
    const auth = await verifyIdToken(idToken);
    assertUserId(userId, auth.uid);
    const current = await getDocument('users', auth.uid, idToken);
    if (!current) throw new Error('Profil utilisateur introuvable.');
    const numericScore = clampScore(score);
    const account = {
      ...current,
      gamesPlayed: Number(current.gamesPlayed || 0) + 1,
      totalScore: Number(current.totalScore || 0) + numericScore,
      bestScore: Math.max(Number(current.bestScore || 0), numericScore),
      cups: Number(current.cups || 0) + (awardCup ? 1 : 0),
      updatedAt: new Date().toISOString(),
    };
    await setDocument('users', auth.uid, account, idToken);
    return res.status(200).json({ ok: true, account: { ...account, idToken } });
  } catch (error) {
    return res
      .status(400)
      .json({
        ok: false,
        message: error.message || 'Mise a jour score impossible.',
      });
  }
};
