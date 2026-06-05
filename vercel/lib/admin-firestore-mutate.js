const {
  addDocument,
  setDocument,
  deleteDocument,
  getDocument,
} = require('./firebase-rest');
const { COLLECTION_ALIASES } = require('./firestore-normalize');

const PRIMARY_COLLECTION = {
  quizzes: 'quizzes',
  users: 'users',
  scores: 'scores',
  battleRooms: 'battleRooms',
};

const ALLOWED = Object.keys(PRIMARY_COLLECTION);

const assertCollection = collection => {
  const key = String(collection || '').trim();
  if (!ALLOWED.includes(key)) {
    throw new Error(
      `Collection invalide. Valeurs acceptees: ${ALLOWED.join(', ')}.`,
    );
  }
  return PRIMARY_COLLECTION[key];
};

const collectionAliases = collection => {
  const key = String(collection || '').trim();
  return COLLECTION_ALIASES[key] || [PRIMARY_COLLECTION[key] || key];
};

const deleteWithFallback = async (collection, id, idToken) => {
  const names = collectionAliases(collection);
  let lastError = null;
  for (const name of names) {
    try {
      await deleteDocument(name, id, idToken);
      return name;
    } catch (error) {
      lastError = error;
      if (!/NOT_FOUND|404/i.test(error.message || '')) {
        throw error;
      }
    }
  }
  if (lastError) throw lastError;
  return names[0];
};

const upsertWithFallback = async (collection, id, data, idToken) => {
  const names = collectionAliases(collection);
  const cleanId = String(id || '').trim();
  const payload = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  if (cleanId) {
    let lastError = null;
    for (const name of names) {
      try {
        const existing = await getDocument(name, cleanId, idToken);
        if (existing) {
          const saved = await setDocument(name, cleanId, payload, idToken);
          return { collection: name, document: saved, created: false };
        }
      } catch (error) {
        lastError = error;
      }
    }
    const primary = names[0];
    const saved = await setDocument(primary, cleanId, payload, idToken);
    return { collection: primary, document: saved, created: !lastError };
  }

  const primary = names[0];
  const created = await addDocument(primary, payload, idToken);
  return { collection: primary, document: created, created: true };
};

const sanitizeDocument = (collection, document) => {
  const data =
    document && typeof document === 'object' ? { ...document } : {};
  delete data.id;
  if (collection === 'quizzes') {
    if (!data.createdAt) data.createdAt = new Date().toISOString();
    if (!data.theme && data.prompt) data.theme = data.prompt;
  }
  if (collection === 'users') {
    delete data.password;
    delete data.idToken;
  }
  return data;
};

module.exports = {
  ALLOWED,
  assertCollection,
  deleteWithFallback,
  sanitizeDocument,
  upsertWithFallback,
};
