const { assertPanelAdminKey } = require('../panel-auth');
const { resolveFirestoreIdToken } = require('../panel-firestore');
const {
  assertCollection,
  sanitizeDocument,
  upsertWithFallback,
} = require('../admin-firestore-mutate');
const { normalizeRow } = require('../firestore-normalize');
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
  const document =
    body.document && typeof body.document === 'object' ? body.document : null;

  if (!document) {
    return res.status(400).json({
      ok: false,
      message: 'document (objet) requis.',
    });
  }

  try {
    assertPanelAdminKey(body.panelAdminKey);
    const idToken = await resolveFirestoreIdToken(body.idToken);
    const resolved = assertCollection(collection);
    const payload = sanitizeDocument(resolved, document);
    const result = await upsertWithFallback(
      resolved,
      id || document.id,
      payload,
      idToken,
    );
    return res.status(200).json({
      ok: true,
      created: result.created,
      collection: result.collection,
      row: normalizeRow(result.collection, result.document),
    });
  } catch (error) {
    const message = error.message || 'Enregistrement Firestore impossible.';
    if (isPanelAuthError(message)) {
      return res.status(401).json({ ok: false, message });
    }
    if (isFirestoreAccessError(message)) {
      return res.status(200).json({
        ok: true,
        saved: false,
        message,
      });
    }
    return res.status(502).json({ ok: false, message });
  }
};
