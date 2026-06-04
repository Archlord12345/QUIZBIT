const { getEnv } = require('./env');
const { firebaseAuthRequest } = require('./firebase-rest');

let cachedToken = null;
let cachedAt = 0;
const TOKEN_TTL_MS = 50 * 60 * 1000;

const getPanelServiceIdToken = async () => {
  if (cachedToken && Date.now() - cachedAt < TOKEN_TTL_MS) {
    return cachedToken;
  }

  const email = getEnv(
    'PANEL_FIRESTORE_EMAIL',
    'ADMIN_FIRESTORE_EMAIL',
    'PANEL_FIREBASE_EMAIL',
  );
  const password = getEnv(
    'PANEL_FIRESTORE_PASSWORD',
    'ADMIN_FIRESTORE_PASSWORD',
    'PANEL_FIREBASE_PASSWORD',
  );

  if (!email || !password) {
    throw new Error(
      'Compte Firestore panel manquant. Definis PANEL_FIRESTORE_EMAIL et PANEL_FIRESTORE_PASSWORD sur Vercel, ou connecte un compte dans Parametres.',
    );
  }

  const auth = await firebaseAuthRequest('accounts:signInWithPassword', {
    email: String(email).trim(),
    password: String(password),
    returnSecureToken: true,
  });

  cachedToken = auth.idToken;
  cachedAt = Date.now();
  return cachedToken;
};

const resolveFirestoreIdToken = async idToken => {
  const clean = String(idToken || '').trim();
  if (clean) return clean;
  return getPanelServiceIdToken();
};

module.exports = {
  getPanelServiceIdToken,
  resolveFirestoreIdToken,
};
