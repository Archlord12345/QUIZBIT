const { deleteDocument, getDocument } = require('../firebase-rest');
const { verifyIdToken } = require('../auth-verify');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const { account, code, idToken } = req.body || {};
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!idToken || !cleanCode || !account?.id) {
    return res.status(400).json({ ok: false, message: 'Session et code de salle requis.' });
  }

  try {
    const auth = await verifyIdToken(idToken);
    if (account.id !== auth.uid) {
      throw new Error('Seul l hote peut supprimer cette salle.');
    }
    const room = await getDocument('battleRooms', cleanCode, idToken);
    if (!room) throw new Error('Salle battle royale introuvable dans Firestore.');
    if (room.hostId !== auth.uid) {
      throw new Error('Seul l hote peut supprimer cette salle.');
    }
    await deleteDocument('battleRooms', cleanCode, idToken);
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || 'Suppression lobby impossible.' });
  }
};
