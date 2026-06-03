const { getDocument, setDocument } = require('./firebase-rest');

const createPlayer = account => ({
  userId: account.id,
  displayName: account.displayName || 'Player',
  score: 0,
  eliminated: false,
  finished: false,
});

const normalizeConfig = config => ({
  theme: String(config?.theme || '').trim() || 'culture generale',
  maxPlayers: Math.max(
    2,
    Math.min(100, Math.floor(Number(config?.maxPlayers || 10))),
  ),
  questionCount: Math.max(
    3,
    Math.min(20, Math.floor(Number(config?.questionCount || 5))),
  ),
  eliminationScore: Math.max(
    0,
    Math.floor(Number(config?.eliminationScore || 20)),
  ),
});

const generateCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const requireSession = body => {
  if (!body?.idToken) throw new Error('idToken requis.');
  return body.idToken;
};

const requireAccount = body => {
  if (!body?.account?.id) throw new Error('Compte requis.');
  return body.account;
};

const getRoom = async (code, idToken) =>
  getDocument(
    'battleRooms',
    String(code || '')
      .trim()
      .toUpperCase(),
    idToken,
  );
const saveRoom = async (room, idToken) =>
  setDocument('battleRooms', room.code, room, idToken);

module.exports = {
  createPlayer,
  generateCode,
  getRoom,
  normalizeConfig,
  requireAccount,
  requireSession,
  saveRoom,
};
