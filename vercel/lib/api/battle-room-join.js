const { getDocument, setDocument } = require('../firebase-rest');

const createPlayer = account => ({
  userId: account.id,
  displayName: account.displayName || 'Player',
  score: 0,
  eliminated: false,
  finished: false,
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const { account, code, idToken } = req.body || {};
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!idToken || !account?.id || !cleanCode) {
    return res.status(400).json({ ok: false, message: 'Compte et code de salle requis.' });
  }

  try {
    const room = await getDocument('battleRooms', cleanCode, idToken);
    if (!room) throw new Error('Salle battle royale introuvable dans Firestore.');
    if (room.status !== 'waiting') throw new Error('Cette salle a deja demarre.');
    if ((room.players || []).length >= room.config.maxPlayers) throw new Error('Cette salle est complete.');

    const exists = (room.players || []).some(player => player.userId === account.id);
    const updatedRoom = exists
      ? room
      : { ...room, players: [...(room.players || []), createPlayer(account)] };
    await setDocument('battleRooms', cleanCode, updatedRoom, idToken);
    return res.status(200).json({ ok: true, room: updatedRoom });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || 'Connexion salle impossible.' });
  }
};
