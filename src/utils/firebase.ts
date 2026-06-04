import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import Config from 'react-native-config';

type RuntimeConfig = Record<string, string | undefined>;

const readRuntimeValue = (name: string): string => {
  const nativeConfig = Config as unknown as RuntimeConfig;
  const maybeProcess = (
    globalThis as unknown as { process?: { env?: Record<string, string> } }
  ).process;
  return nativeConfig[name] || maybeProcess?.env?.[name] || '';
};

const readFirebaseValue = (name: string): string => {
  return (
    readRuntimeValue(`FIREBASE_${name}`) ||
    readRuntimeValue(`REACT_APP_FIREBASE_${name}`) ||
    readRuntimeValue(`VITE_FIREBASE_${name}`)
  );
};

const firebaseConfig = {
  apiKey: readFirebaseValue('API_KEY'),
  authDomain: readFirebaseValue('AUTH_DOMAIN'),
  projectId: readFirebaseValue('PROJECT_ID'),
  storageBucket: readFirebaseValue('STORAGE_BUCKET'),
  messagingSenderId: readFirebaseValue('MESSAGING_SENDER_ID'),
  appId: readFirebaseValue('APP_ID'),
  measurementId: readFirebaseValue('MEASUREMENT_ID'),
};

export const firebaseEnabled = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (firebaseEnabled) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { app, auth, db };

export const firebaseMissingConfigMessage =
  "Configuration Firestore introuvable dans l'app. Renseigne FIREBASE_API_KEY, FIREBASE_PROJECT_ID et FIREBASE_APP_ID (ou REACT_APP_FIREBASE_*) puis reconstruis l'APK.";
