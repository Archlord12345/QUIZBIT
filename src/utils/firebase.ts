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

const firebaseConfig = {
  apiKey: readRuntimeValue('FIREBASE_API_KEY'),
  authDomain: readRuntimeValue('FIREBASE_AUTH_DOMAIN'),
  projectId: readRuntimeValue('FIREBASE_PROJECT_ID'),
  storageBucket: readRuntimeValue('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readRuntimeValue('FIREBASE_MESSAGING_SENDER_ID'),
  appId: readRuntimeValue('FIREBASE_APP_ID'),
  measurementId: readRuntimeValue('FIREBASE_MEASUREMENT_ID'),
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
