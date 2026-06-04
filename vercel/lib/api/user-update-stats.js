const { getDocument, setDocument } = require('../firebase-rest');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }
  const { idToken, score, userId } = req.body || {};
  if (!idToken || !userId) {
    return res
      .status(400)
      .json({ ok: false, message: 'idToken et userId requis.' });
  }
  try {
    const current = await getDocument('users', userId, idToken);
    if (!current) throw new Error('Profil utilisateur introuvable.');
    const numericScore = Number(score || 0);
    const account = {
      ...current,
      gamesPlayed: Number(current.gamesPlayed || 0) + 1,
      totalScore: Number(current.totalScore || 0) + numericScore,
      bestScore: Math.max(Number(current.bestScore || 0), numericScore),
      updatedAt: new Date().toISOString(),
    };
    await setDocument('users', userId, account, idToken);
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
