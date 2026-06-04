const { listDocuments } = require('../firebase-rest');
const { assertPanelAdminKey } = require('../panel-auth');
const { resolveFirestoreIdToken } = require('../panel-firestore');
const {
  COLLECTION_ALIASES,
  ORDER_BY,
  normalizeRow,
} = require('../firestore-normalize');

const PAGE_SIZE = 100;

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

    return res.status(200).json({
      ok: true,
      collection: resolvedName,
      rows: rows.map(row => normalizeRow(resolvedName, row)),
      count: rows.length,
    });
  } catch (error) {
    const message = error.message || 'Lecture Firestore impossible.';
    const status = message.includes('panel') ? 401 : 502;
    return res.status(status).json({ ok: false, message });
  }
};
