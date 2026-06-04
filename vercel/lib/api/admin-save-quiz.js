const { addDocument } = require('../firebase-rest');
const { assertPanelAdminKey } = require('../panel-auth');
const { resolveFirestoreIdToken } = require('../panel-firestore');
const { normalizeQuiz } = require('../firestore-normalize');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const theme = String(body.theme || body.prompt || '').trim();
  const questions = Array.isArray(body.questions) ? body.questions : [];

  if (!theme || !questions.length) {
    return res.status(400).json({
      ok: false,
      message: 'theme et questions[] requis.',
    });
  }

  try {
    assertPanelAdminKey(body.panelAdminKey);
    const idToken = await resolveFirestoreIdToken(body.idToken);
    const payload = normalizeQuiz({
      theme,
      questions,
      provider: body.provider || '',
      model: body.model || '',
      format: body.format || 'quizbit-quiz-v1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: body.source || 'admin-panel',
    });

    const saved = await addDocument('quizzes', payload, idToken);
    return res.status(200).json({ ok: true, quiz: saved });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      message: error.message || 'Enregistrement quiz impossible.',
    });
  }
};
