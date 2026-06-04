const toArray = value => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
};

const normalizeQuestions = raw => {
  const list = toArray(raw);
  return list
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const text = String(item.text || item.question || item.label || '').trim();
      const answer = String(item.answer || item.correctAnswer || '').trim();
      if (!text) return null;
      const type = item.type === 'open' ? 'open' : 'mcq';
      const options = toArray(item.options || item.choices).map(String).filter(Boolean);
      if (type === 'open' || options.length < 2) {
        return {
          id: String(item.id || `open-${index + 1}`),
          text,
          answer: answer || '—',
          type: 'open',
        };
      }
      return {
        id: String(item.id || `mcq-${index + 1}`),
        text,
        answer: answer || options[0],
        options,
        type: 'mcq',
      };
    })
    .filter(Boolean);
};

const normalizeQuiz = doc => ({
  ...doc,
  theme: String(doc.theme || doc.prompt || doc.title || doc.name || 'Quiz').trim(),
  questions: normalizeQuestions(doc.questions || doc.Questions || doc.items),
  createdAt: doc.createdAt || doc.updatedAt || doc.date || null,
});

const normalizeUser = doc => ({
  ...doc,
  displayName:
    doc.displayName || doc.username || doc.name || doc.email?.split('@')[0] || 'Player',
});

const normalizeScore = doc => ({
  ...doc,
  displayName: doc.displayName || doc.playerName || 'Player',
  score: Number(doc.score || 0),
  mode: doc.mode === 'battle_royale' ? 'battle_royale' : 'solo',
});

const normalizeBattleRoom = doc => ({
  ...doc,
  code: doc.code || doc.id,
  config: doc.config || {},
  players: toArray(doc.players),
});

const COLLECTION_ALIASES = {
  quizzes: ['quizzes', 'quiz', 'Quiz'],
  users: ['users', 'user', 'players'],
  scores: ['scores', 'score'],
  battleRooms: ['battleRooms', 'battle_rooms', 'battles'],
};

const ORDER_BY = {
  quizzes: ['createdAt desc', 'updatedAt desc', ''],
  users: ['totalScore desc', 'bestScore desc', ''],
  scores: ['score desc', 'createdAt desc', ''],
  battleRooms: ['createdAt desc', ''],
};

const normalizeRow = (collection, doc) => {
  if (collection === 'quizzes' || collection === 'quiz') return normalizeQuiz(doc);
  if (collection === 'users') return normalizeUser(doc);
  if (collection === 'scores') return normalizeScore(doc);
  if (collection === 'battleRooms') return normalizeBattleRoom(doc);
  return doc;
};

module.exports = {
  COLLECTION_ALIASES,
  ORDER_BY,
  normalizeQuestions,
  normalizeQuiz,
  normalizeRow,
  toArray,
};
