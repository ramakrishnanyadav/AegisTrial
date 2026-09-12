/**
 * firebase.ts — Firebase SDK Initialization.
 * Configured with live guardagent-d49b6 Firebase credentials.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  type Auth,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAdaDFzPvEMCbdF0e1yJ_9yBZOmUTb3-bE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "guardagent-d49b6.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://guardagent-d49b6-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "guardagent-d49b6",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "guardagent-d49b6.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "823766521713",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:823766521713:web:b73d7b45526c42516f08d0",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-4EDEW9MPVP"
};

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!;
export const auth: Auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const githubProvider = new GithubAuthProvider();
