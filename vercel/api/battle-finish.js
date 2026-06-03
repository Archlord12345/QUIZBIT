const {
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
    const score = Number(req.body.score || 0);
    const players = (room.players || []).map(player =>
      player.userId === account.id
        ? {
            ...player,
            score,
            finished: true,
            eliminated: score < room.config.eliminationScore,
          }
        : player,
    );
    const allFinished = players.every(player => player.finished);
    const survivors = players.filter(player => !player.eliminated);
    const winner = [...players].sort(
      (left, right) => right.score - left.score,
    )[0];
    const updatedRoom = {
      ...room,
      players,
      status: allFinished ? 'finished' : room.status,
      winnerId: allFinished
        ? survivors[0]?.userId || winner?.userId
        : room.winnerId,
    };
    await saveRoom(updatedRoom, idToken);
    return res.status(200).json({ ok: true, room: updatedRoom });
  } catch (error) {
    return res
      .status(400)
      .json({ ok: false, message: error.message || 'Fin battle impossible.' });
  }
};
