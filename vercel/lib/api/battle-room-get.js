const { getDocument } = require('../firebase-rest');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const { code, idToken } = req.body || {};
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!idToken || !cleanCode) {
    return res.status(400).json({ ok: false, message: 'Session et code de salle requis.' });
  }

  try {
    const room = await getDocument('battleRooms', cleanCode, idToken);
    if (!room) throw new Error('Salle battle royale introuvable dans Firestore.');
    return res.status(200).json({ ok: true, room });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || 'Lecture salle impossible.' });
  }
};
