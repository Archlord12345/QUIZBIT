const { assertPanelAdminKey } = require('../panel-auth');
const { resolveFirestoreIdToken } = require('../panel-firestore');
const {
  assertCollection,
  deleteWithFallback,
} = require('../admin-firestore-mutate');
const {
  isFirestoreAccessError,
  isPanelAuthError,
} = require('../panel-api-errors');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const collection = String(body.collection || '').trim();
  const id = String(body.id || '').trim();

  if (!id) {
    return res.status(400).json({ ok: false, message: 'id requis.' });
  }

  try {
    assertPanelAdminKey(body.panelAdminKey);
    const idToken = await resolveFirestoreIdToken(body.idToken);
    const resolved = assertCollection(collection);
    const usedCollection = await deleteWithFallback(resolved, id, idToken);
    return res.status(200).json({
      ok: true,
      deleted: true,
      collection: usedCollection,
      id,
    });
  } catch (error) {
    const message = error.message || 'Suppression Firestore impossible.';
    if (isPanelAuthError(message)) {
      return res.status(401).json({ ok: false, message });
    }
    if (isFirestoreAccessError(message)) {
      return res.status(200).json({
        ok: true,
        deleted: false,
        message,
      });
    }
    return res.status(502).json({ ok: false, message });
  }
};
