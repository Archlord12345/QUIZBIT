const { getDocument, setDocument } = require('../firebase-rest');
const { assertAccountId, verifyIdToken } = require('../auth-verify');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const { account, code, idToken, questions } = req.body || {};
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!idToken || !account?.id || !cleanCode || !Array.isArray(questions) || !questions.length) {
    return res.status(400).json({ ok: false, message: 'Code, session et questions requis.' });
  }

  try {
    const auth = await verifyIdToken(idToken);
    assertAccountId(account, auth.uid);
    const room = await getDocument('battleRooms', cleanCode, idToken);
    if (!room) throw new Error('Salle battle royale introuvable dans Firestore.');
    if (room.hostId !== auth.uid) {
      throw new Error('Seul l hote peut lancer la partie.');
    }
    const updatedRoom = { ...room, status: 'active', questions, chatMessages: [] };
    await setDocument('battleRooms', cleanCode, updatedRoom, idToken);
    return res.status(200).json({ ok: true, room: updatedRoom });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || 'Demarrage salle impossible.' });
  }
};
