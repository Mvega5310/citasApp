import admin from 'firebase-admin';

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

const getServiceAccount = (): ServiceAccount | null => {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    const json = Buffer.from(b64, 'base64').toString('utf-8');
    return JSON.parse(json);
  }
  const project_id = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const client_email = process.env.FIREBASE_CLIENT_EMAIL;
  const private_key = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (project_id && client_email && private_key) {
    return { project_id, client_email, private_key };
  }
  return null;
};

const isEmulator =
  process.env.APP_ENV === 'development' ||
  process.env.NEXT_PUBLIC_APP_ENV === 'development' ||
  !!process.env.FIRESTORE_EMULATOR_HOST;

const sa = getServiceAccount();

if (!admin.apps.length) {
  if (isEmulator) {
    // En emulador no necesitamos credenciales reales
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? 'localhost:9099';
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'turnos-de-belleza',
    });
  } else if (sa) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
    });
  }
}

export const isFirebaseConfigured = isEmulator || !!sa;

export const adminDb = () => {
  if (!admin.apps.length) {
    throw new Error('Firebase Admin no configurado. Verifica las variables de entorno.');
  }
  return admin.firestore();
};

export const adminAuth = () => {
  if (!admin.apps.length) {
    throw new Error('Firebase Admin no configurado. Verifica las variables de entorno.');
  }
  return admin.auth();
};
