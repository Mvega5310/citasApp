import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { env } from './env';

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const hasFirebaseConfig =
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.authDomain &&
  !!firebaseConfig.projectId &&
  !!firebaseConfig.appId;

const app = hasFirebaseConfig
  ? getApps()[0] ?? initializeApp(firebaseConfig)
  : null;

export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;
export const isFirebaseConfigured = hasFirebaseConfig;

// Conectar al emulador solo en desarrollo y solo una vez
if (
  app &&
  process.env.NEXT_PUBLIC_APP_ENV === 'development' &&
  typeof window !== 'undefined'
) {
  // @ts-expect-error flag para evitar doble conexión en HMR
  if (!window.__firebaseEmulatorsConnected) {
    // @ts-expect-error
    window.__firebaseEmulatorsConnected = true;
    if (db) connectFirestoreEmulator(db, 'localhost', 8080);
    if (auth) connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  }
}

export function getFirebaseApp() {
  if (!hasFirebaseConfig) {
    throw new Error('Firebase no está configurado.');
  }
  return app ?? getApp();
}

export default app;
