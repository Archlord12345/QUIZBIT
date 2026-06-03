const { validateAnswer } = require('./gemini-quiz');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }
  try {
    const { correctAnswer, provider, userAnswer } = req.body || {};
    if (
      !String(userAnswer || '').trim() ||
      !String(correctAnswer || '').trim()
    ) {
      return res.status(400).json({
        ok: false,
        message: 'userAnswer et correctAnswer sont requis.',
      });
    }
    const correct = await validateAnswer(
      userAnswer,
      correctAnswer,
      provider || 'auto',
    );
    return res.status(200).json({ ok: true, correct });
  } catch (error) {
    return res
      .status(502)
      .json({ ok: false, message: error.message || 'Validation impossible.' });
  }
};
