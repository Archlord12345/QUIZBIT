const { generateQuestions } = require('./gemini-quiz');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }
  try {
    const { count, prompt, theme } = req.body || {};
    const result = await generateQuestions(prompt || theme, count || 5);
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    return res
      .status(502)
      .json({
        ok: false,
        message: error.message || 'Generation Gemini impossible.',
      });
  }
};
