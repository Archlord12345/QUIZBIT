const { listDocuments } = require('../firebase-rest');
const { verifyIdToken } = require('../auth-verify');
const { normalizeRow } = require('../firestore-normalize');

const toLobbySummary = room => {
  const players = Array.isArray(room.players) ? room.players : [];
  const host =
    players.find(player => player.userId === room.hostId) || players[0] || null;
  return {
    code: String(room.code || room.id || '').trim().toUpperCase(),
    theme: String(room.config?.theme || 'Culture generale').trim(),
    status: room.status === 'active' ? 'active' : 'waiting',
    mode: room.config?.mode === 'timed_mcq' ? 'timed_mcq' : 'classic',
    playerCount: players.length,
    maxPlayers: Math.max(2, Number(room.config?.maxPlayers || 10)),
    hostName: host?.displayName || 'Hote',
    createdAt: room.createdAt || null,
  };
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const { idToken } = req.body || {};
  if (!idToken) {
    return res.status(400).json({ ok: false, message: 'idToken requis.' });
  }

  try {
    await verifyIdToken(idToken);
    let rows = [];
    try {
      rows = await listDocuments('battleRooms', idToken, 80, 'createdAt desc');
    } catch {
      rows = await listDocuments('battleRooms', idToken, 80, '');
    }

    const rooms = rows
      .map(doc => normalizeRow('battleRooms', doc))
      .filter(room => room.status === 'waiting' || room.status === 'active')
      .map(toLobbySummary)
      .filter(room => room.code)
      .sort(
        (left, right) =>
          new Date(right.createdAt || 0).getTime() -
          new Date(left.createdAt || 0).getTime(),
      );

    return res.status(200).json({ ok: true, rooms });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: error.message || 'Liste des lobbies impossible.',
    });
  }
};
