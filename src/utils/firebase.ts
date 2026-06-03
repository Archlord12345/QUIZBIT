import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB3-z7Zsu8dki3nUuiqHRAlJmbFRk1l5TY",
  authDomain: "quizbit-cecc1.firebaseapp.com",
  projectId: "quizbit-cecc1",
  storageBucket: "quizbit-cecc1.firebasestorage.app",
  messagingSenderId: "80759305815",
  appId: "1:80759305815:web:e8630b7d06e4965bdad512",
  measurementId: "G-4T8SFQHM4G"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
