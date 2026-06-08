import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getPanelAdminKey } from '../panelApi.js';

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.REACT_APP_FIREBASE_API_KEY || env.VITE_FIREBASE_API_KEY || '',
  authDomain:
    env.REACT_APP_FIREBASE_AUTH_DOMAIN || env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId:
    env.REACT_APP_FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket:
    env.REACT_APP_FIREBASE_STORAGE_BUCKET ||
    env.VITE_FIREBASE_STORAGE_BUCKET ||
    '',
  messagingSenderId:
    env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID ||
    env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    '',
  appId: env.REACT_APP_FIREBASE_APP_ID || env.VITE_FIREBASE_APP_ID || '',
  measurementId:
    env.REACT_APP_FIREBASE_MEASUREMENT_ID ||
    env.VITE_FIREBASE_MEASUREMENT_ID ||
    '',
};

export const firebaseEnabled = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

/** Client Firestore uniquement si pas de clé admin au build (sinon API serveur). */
export const panelUsesServerApi = Boolean(getPanelAdminKey());

let firebaseApp = null;
let firestoreDb = null;

export const getFirestoreDb = () => {
  if (!firebaseEnabled || panelUsesServerApi) return null;
  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
    firestoreDb = getFirestore(firebaseApp);
  }
  return firestoreDb;
};
