const { listDocuments } = require('../firebase-rest');
const { verifyIdToken } = require('../auth-verify');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }
  const { idToken, mode } = req.body || {};
  if (!idToken) {
    return res.status(400).json({ ok: false, message: 'idToken requis.' });
  }
  try {
    await verifyIdToken(idToken);
    let scores = [];
    try {
      scores = await listDocuments('scores', idToken, 100, 'score desc');
    } catch {
      scores = await listDocuments('scores', idToken, 100, '');
    }
    const filtered = scores
      .filter(score => !mode || score.mode === mode)
      .sort((left, right) => Number(right.score || 0) - Number(left.score || 0))
      .slice(0, 50);
    return res.status(200).json({
      ok: true,
      scores: filtered,
    });
  } catch (error) {
    return res
      .status(400)
      .json({
        ok: false,
        message: error.message || 'Lecture scores impossible.',
      });
  }
};
