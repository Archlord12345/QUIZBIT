const { getEnv } = require('./env');

const firebaseApiKey = () =>
  getEnv('FIREBASE_API_KEY', 'REACT_APP_FIREBASE_API_KEY');
const firebaseProjectId = () =>
  getEnv('FIREBASE_PROJECT_ID', 'REACT_APP_FIREBASE_PROJECT_ID');

const assertFirebaseEnv = () => {
  if (!firebaseApiKey() || !firebaseProjectId()) {
    throw new Error('Configuration Firebase serveur manquante.');
  }
};

const firebaseAuthMessage = code => {
  const normalized = String(code || '');
  const messages = {
    CONFIGURATION_NOT_FOUND:
      'Firebase Auth n est pas configure pour ce projet. Active Firebase Authentication et le fournisseur Email/Mot de passe dans Firebase Console, puis redeploie Vercel.',
    EMAIL_NOT_FOUND: 'Email ou mot de passe invalide.',
    INVALID_LOGIN_CREDENTIALS: 'Email ou mot de passe invalide.',
    INVALID_PASSWORD: 'Email ou mot de passe invalide.',
    EMAIL_EXISTS: 'Un compte existe deja avec cet email.',
    OPERATION_NOT_ALLOWED:
      'Le fournisseur Email/Mot de passe est desactive dans Firebase Authentication.',
  };
  return messages[normalized] || normalized;
};

const createFirebaseAuthError = (data, status) => {
  const code = data?.error?.message || `Firebase Auth HTTP ${status}`;
  const error = new Error(firebaseAuthMessage(code));
  error.code = code;
  error.status = status;
  return error;
};

const firebaseAuthRequest = async (path, payload) => {
  assertFirebaseEnv();
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/${path}?key=${firebaseApiKey()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw createFirebaseAuthError(data, response.status);
  }
  return data;
};

const firestoreBaseUrl = () => {
  assertFirebaseEnv();
  return `https://firestore.googleapis.com/v1/projects/${firebaseProjectId()}/databases/(default)/documents`;
};

const authHeaders = idToken => ({
  Authorization: `Bearer ${idToken}`,
  'Content-Type': 'application/json',
});

const toValue = value => {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value))
    return { arrayValue: { values: value.map(toValue) } };
  if (typeof value === 'object')
    return { mapValue: { fields: toFields(value) } };
  return { stringValue: String(value) };
};

const toFields = data =>
  Object.entries(data).reduce((fields, [key, value]) => {
    if (value !== undefined) fields[key] = toValue(value);
    return fields;
  }, {});

const fromValue = value => {
  if (!value || typeof value !== 'object') return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value)
    return (value.arrayValue.values || []).map(fromValue);
  if ('mapValue' in value) return fromFields(value.mapValue.fields || {});
  return undefined;
};

const fromFields = fields =>
  Object.entries(fields || {}).reduce((data, [key, value]) => {
    data[key] = fromValue(value);
    return data;
  }, {});

const documentIdFromName = name =>
  String(name || '')
    .split('/')
    .pop();

const getDocument = async (collection, id, idToken) => {
  const response = await fetch(`${firestoreBaseUrl()}/${collection}/${id}`, {
    headers: authHeaders(idToken),
  });
  if (response.status === 404) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.error?.message || `Firestore HTTP ${response.status}`,
    );
  }
  return { id: documentIdFromName(data.name), ...fromFields(data.fields) };
};

const setDocument = async (collection, id, data, idToken) => {
  const response = await fetch(`${firestoreBaseUrl()}/${collection}/${id}`, {
    method: 'PATCH',
    headers: authHeaders(idToken),
    body: JSON.stringify({ fields: toFields(data) }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      body?.error?.message || `Firestore HTTP ${response.status}`,
    );
  }
  return { id: documentIdFromName(body.name), ...fromFields(body.fields) };
};

const addDocument = async (collection, data, idToken) => {
  const response = await fetch(`${firestoreBaseUrl()}/${collection}`, {
    method: 'POST',
    headers: authHeaders(idToken),
    body: JSON.stringify({ fields: toFields(data) }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      body?.error?.message || `Firestore HTTP ${response.status}`,
    );
  }
  return { id: documentIdFromName(body.name), ...fromFields(body.fields) };
};

const deleteDocument = async (collection, id, idToken) => {
  const response = await fetch(`${firestoreBaseUrl()}/${collection}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(idToken),
  });
  if (response.status === 404) return;
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body?.error?.message || `Firestore HTTP ${response.status}`,
    );
  }
};

const listDocuments = async (
  collection,
  idToken,
  pageSize = 25,
  orderBy = '',
) => {
  const params = new URLSearchParams({ pageSize: String(pageSize) });
  if (orderBy) params.set('orderBy', orderBy);
  const response = await fetch(
    `${firestoreBaseUrl()}/${collection}?${params.toString()}`,
    {
      headers: authHeaders(idToken),
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      body?.error?.message || `Firestore HTTP ${response.status}`,
    );
  }
  return (body.documents || []).map(doc => ({
    id: documentIdFromName(doc.name),
    ...fromFields(doc.fields),
  }));
};

module.exports = {
  addDocument,
  deleteDocument,
  firebaseAuthRequest,
  getDocument,
  listDocuments,
  setDocument,
  firebaseApiKey,
};
