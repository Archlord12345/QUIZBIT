const { generateQuestions } = require('./gemini-quiz');
const { getRoom, requireSession, saveRoom } = require('./battle-shared');

module.exports = async (req, res) => {
  if (req.method !== 'POST')
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  try {
    const idToken = requireSession(req.body);
    const room = await getRoom(req.body.code, idToken);
    if (!room) throw new Error('Salle battle royale introuvable.');
    const result = await generateQuestions(
      room.config.theme,
      room.config.questionCount,
    );
    const updatedRoom = {
      ...room,
      status: 'active',
      questions: result.questions,
    };
    await saveRoom(updatedRoom, idToken);
    return res.status(200).json({ ok: true, room: updatedRoom });
  } catch (error) {
    return res
      .status(400)
      .json({
        ok: false,
        message: error.message || 'Demarrage battle impossible.',
      });
  }
};
