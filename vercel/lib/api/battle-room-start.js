const { getDocument, setDocument } = require('../firebase-rest');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const { code, idToken, questions } = req.body || {};
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!idToken || !cleanCode || !Array.isArray(questions) || !questions.length) {
    return res.status(400).json({ ok: false, message: 'Code, session et questions requis.' });
  }

  try {
    const room = await getDocument('battleRooms', cleanCode, idToken);
    if (!room) throw new Error('Salle battle royale introuvable dans Firestore.');
    const updatedRoom = { ...room, status: 'active', questions };
    await setDocument('battleRooms', cleanCode, updatedRoom, idToken);
    return res.status(200).json({ ok: true, room: updatedRoom });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || 'Demarrage salle impossible.' });
  }
};
