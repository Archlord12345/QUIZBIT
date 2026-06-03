const {
  createPlayer,
  generateCode,
  normalizeConfig,
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
    const room = {
      id: `room-${Date.now()}`,
      code: generateCode(),
      hostId: account.id,
      status: 'waiting',
      config: normalizeConfig(req.body.config),
      players: [createPlayer(account)],
      createdAt: new Date().toISOString(),
    };
    await saveRoom(room, idToken);
    return res.status(200).json({ ok: true, room });
  } catch (error) {
    return res
      .status(400)
      .json({
        ok: false,
        message: error.message || 'Creation battle impossible.',
      });
  }
};
