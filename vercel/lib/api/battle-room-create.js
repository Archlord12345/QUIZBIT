const { setDocument } = require('../firebase-rest');

const createPlayer = account => ({
  userId: account.id,
  displayName: account.displayName || 'Player',
  score: 0,
  eliminated: false,
  finished: false,
});

const generateCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const normalizeConfig = config => ({
  mode: config?.mode === 'timed_mcq' ? 'timed_mcq' : 'classic',
  theme: String(config?.theme || '').trim() || 'culture generale',
  maxPlayers: Math.max(2, Math.min(100, Math.floor(Number(config?.maxPlayers || 10)))),
  questionCount: Math.max(3, Math.min(20, Math.floor(Number(config?.questionCount || 5)))),
  eliminationScore: Math.max(0, Math.floor(Number(config?.eliminationScore || 20))),
  timeLimitSeconds: Math.max(5, Math.min(120, Math.floor(Number(config?.timeLimitSeconds || 15)))),
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const { account, config, idToken } = req.body || {};
  if (!idToken || !account?.id) {
    return res.status(400).json({ ok: false, message: 'Compte authentifie requis.' });
  }

  try {
    const room = {
      id: `room-${Date.now()}`,
      code: generateCode(),
      hostId: account.id,
      status: 'waiting',
      config: normalizeConfig(config),
      players: [createPlayer(account)],
      chatMessages: [],
      createdAt: new Date().toISOString(),
    };
    await setDocument('battleRooms', room.code, room, idToken);
    return res.status(200).json({ ok: true, room });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || 'Creation salle impossible.' });
  }
};
