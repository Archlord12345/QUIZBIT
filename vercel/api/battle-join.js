const {
  createPlayer,
  getRoom,
  requireAccount,
  requireSession,
  saveRoom,
} = require('./battle-shared');

module.exports = async (req, res) => {
  if (req.method !== 'POST')
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  try {
    const idToken = requireSession(req.body);
    const account = requireAccount(req.body);
    const room = await getRoom(req.body.code, idToken);
    if (!room) throw new Error('Salle battle royale introuvable.');
    if (room.status !== 'waiting')
      throw new Error('Cette salle a deja demarre.');
    if ((room.players || []).length >= room.config.maxPlayers)
      throw new Error('Cette salle est complete.');
    const exists = (room.players || []).some(
      player => player.userId === account.id,
    );
    const updatedRoom = exists
      ? room
      : { ...room, players: [...(room.players || []), createPlayer(account)] };
    await saveRoom(updatedRoom, idToken);
    return res.status(200).json({ ok: true, room: updatedRoom });
  } catch (error) {
    return res
      .status(400)
      .json({
        ok: false,
        message: error.message || 'Rejoindre battle impossible.',
      });
  }
};
