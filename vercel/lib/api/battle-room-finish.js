const { getDocument, setDocument } = require('../firebase-rest');
const { assertAccountId, clampScore, verifyIdToken } = require('../auth-verify');
const { incrementUserCups } = require('../user-cups');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const { account, code, idToken, score } = req.body || {};
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!idToken || !account?.id || !cleanCode) {
    return res.status(400).json({ ok: false, message: 'Compte et code de salle requis.' });
  }

  try {
    const auth = await verifyIdToken(idToken);
    assertAccountId(account, auth.uid);
    const room = await getDocument('battleRooms', cleanCode, idToken);
    if (!room) throw new Error('Salle battle royale introuvable dans Firestore.');
    const numericScore = clampScore(score);
    const players = (room.players || []).map(player =>
      player.userId === auth.uid
        ? {
            ...player,
            score: numericScore,
            finished: true,
            eliminated: numericScore < Number(room.config?.eliminationScore || 0),
          }
        : player,
    );
    const allFinished = players.length > 0 && players.every(player => player.finished);
    const survivors = players.filter(player => !player.eliminated);
    const winner = [...players].sort((left, right) => right.score - left.score)[0];
    const updatedRoom = {
      ...room,
      players,
      status: allFinished ? 'finished' : room.status,
      winnerId: allFinished ? survivors[0]?.userId || winner?.userId : room.winnerId,
    };
    await setDocument('battleRooms', cleanCode, updatedRoom, idToken);

    let cupAwarded = false;
    let account = null;
    if (allFinished && updatedRoom.winnerId) {
      const winnerAccount = await incrementUserCups(
        updatedRoom.winnerId,
        idToken,
      );
      if (winnerAccount && updatedRoom.winnerId === auth.uid) {
        cupAwarded = true;
        account = { ...winnerAccount, idToken };
      }
    }

    return res.status(200).json({
      ok: true,
      room: updatedRoom,
      cupAwarded,
      account,
    });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || 'Fin battle impossible.' });
  }
};
