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
    const scores = await listDocuments('scores', idToken, 25, 'score desc');
    return res.status(200).json({
      ok: true,
      scores: scores.filter(score => !mode || score.mode === mode),
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
