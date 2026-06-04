const { listDocuments } = require('../firebase-rest');
const { assertPanelAdminKey } = require('../panel-auth');
const { resolveFirestoreIdToken } = require('../panel-firestore');
const { COLLECTION_ALIASES } = require('../firestore-normalize');

const countCollection = async (aliases, idToken) => {
  let lastError = null;
  for (const name of aliases) {
    try {
      const rows = await listDocuments(name, idToken, 500, '');
      return { count: rows.length, name };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Collection illisible.');
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};

  try {
    assertPanelAdminKey(body.panelAdminKey);
    const idToken = await resolveFirestoreIdToken(body.idToken);

    const [quizzes, users, scores, battleRooms] = await Promise.all([
      countCollection(COLLECTION_ALIASES.quizzes, idToken),
      countCollection(COLLECTION_ALIASES.users, idToken),
      countCollection(COLLECTION_ALIASES.scores, idToken),
      countCollection(COLLECTION_ALIASES.battleRooms, idToken),
    ]);

    return res.status(200).json({
      ok: true,
      stats: {
        quizzes: quizzes.count,
        players: users.count,
        scores: scores.count,
        battleRooms: battleRooms.count,
      },
      collections: {
        quizzes: quizzes.name,
        users: users.name,
        scores: scores.name,
        battleRooms: battleRooms.name,
      },
    });
  } catch (error) {
    const message = error.message || 'Statistiques Firestore impossibles.';
    const status = message.includes('panel') ? 401 : 502;
    return res.status(status).json({ ok: false, message });
  }
};
