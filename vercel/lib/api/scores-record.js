const { addDocument } = require('../firebase-rest');

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
    const scoreEntry = {
      userId: account.id,
      displayName: account.displayName || 'Player',
      theme: String(theme || ''),
      score: Number(score || 0),
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
