const { listDocuments } = require('../firebase-rest');
const { assertPanelAdminKey } = require('../panel-auth');
const { resolveFirestoreIdToken } = require('../panel-firestore');
const {
  isFirestoreAccessError,
  isPanelAuthError,
} = require('../panel-api-errors');
const {
  COLLECTION_ALIASES,
  ORDER_BY,
  normalizeRow,
} = require('../firestore-normalize');
const { resolveAvatarUrl } = require('../default-avatar');

const PAGE_SIZE = 100;

const loadUsersById = async idToken => {
  try {
    const { rows } = await listWithFallback('users', idToken);
    return Object.fromEntries(
      rows
        .map(row => normalizeRow('users', row))
        .filter(user => user?.id)
        .map(user => [user.id, user]),
    );
  } catch {
    return {};
  }
};

const enrichRowsWithAvatars = async (resolvedName, rows, idToken) => {
  const needsUsers = resolvedName === 'scores' || resolvedName === 'battleRooms';
  if (!needsUsers) {
    return rows.map(row => normalizeRow(resolvedName, row));
  }

  const usersById = await loadUsersById(idToken);

  return rows.map(row => {
    const normalized = normalizeRow(resolvedName, row);
    if (resolvedName === 'scores') {
      const user = usersById[normalized.userId];
      return {
        ...normalized,
        avatarUrl: resolveAvatarUrl(
          user?.avatarUrl || normalized.avatarUrl,
          normalized.userId || normalized.id,
          normalized.displayName || user?.displayName,
        ),
      };
    }
    if (resolvedName === 'battleRooms') {
      const players = Array.isArray(normalized.players) ? normalized.players : [];
      return {
        ...normalized,
        players: players.map(player => {
          const user = usersById[player.userId];
          return {
            ...player,
            avatarUrl: resolveAvatarUrl(
              user?.avatarUrl,
              player.userId,
              player.displayName || user?.displayName,
            ),
          };
        }),
      };
    }
    return normalized;
  });
};

const listWithFallback = async (collection, idToken) => {
  const orders = ORDER_BY[collection] || [''];
  const names = COLLECTION_ALIASES[collection] || [collection];
  let lastError = null;

  for (const name of names) {
    for (const orderBy of orders) {
      try {
        const rows = await listDocuments(name, idToken, PAGE_SIZE, orderBy);
        return { rows, collection: name };
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw lastError || new Error(`Collection ${collection} illisible.`);
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const collection = String(body.collection || '').trim();

  if (!collection) {
    return res.status(400).json({ ok: false, message: 'collection requis.' });
  }

  try {
    assertPanelAdminKey(body.panelAdminKey);
    const idToken = await resolveFirestoreIdToken(body.idToken);
    const { rows, collection: resolvedName } = await listWithFallback(
      collection,
      idToken,
    );

    const enrichedRows = await enrichRowsWithAvatars(
      resolvedName,
      rows,
      idToken,
    );

    return res.status(200).json({
      ok: true,
      firestoreReady: true,
      collection: resolvedName,
      rows: enrichedRows,
      count: enrichedRows.length,
    });
  } catch (error) {
    const message = error.message || 'Lecture Firestore impossible.';
    if (isPanelAuthError(message)) {
      return res.status(401).json({ ok: false, message });
    }
    if (isFirestoreAccessError(message)) {
      return res.status(200).json({
        ok: true,
        firestoreReady: false,
        collection,
        rows: [],
        count: 0,
        message,
      });
    }
    return res.status(502).json({ ok: false, message });
  }
};
