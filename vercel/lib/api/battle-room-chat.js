const { getDocument, setDocument } = require('../firebase-rest');

const cleanMessage = value =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const { account, code, idToken, text } = req.body || {};
  const cleanCode = String(code || '').trim().toUpperCase();
  const messageText = cleanMessage(text);
  if (!idToken || !account?.id || !cleanCode || !messageText) {
    return res.status(400).json({ ok: false, message: 'Compte, code et message requis.' });
  }

  try {
    const room = await getDocument('battleRooms', cleanCode, idToken);
    if (!room) throw new Error('Salle battle royale introuvable dans Firestore.');
    if (room.status !== 'waiting') {
      throw new Error('Le chat du lobby est ferme apres le lancement du jeu.');
    }

    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId: account.id,
      displayName: account.displayName || 'Player',
      text: messageText,
      createdAt: new Date().toISOString(),
    };
    const chatMessages = [...(room.chatMessages || []), message].slice(-100);
    const updatedRoom = { ...room, chatMessages };
    await setDocument('battleRooms', cleanCode, updatedRoom, idToken);
    return res.status(200).json({ ok: true, room: updatedRoom });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || 'Envoi message impossible.' });
  }
};
