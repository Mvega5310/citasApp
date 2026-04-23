export type AppEnv = 'development' | 'test' | 'production';

export const env = {
  APP_ENV: (process.env.APP_ENV as AppEnv) || 'development',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''
};

export const validateEnv = (): void => {
  const required = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ] as const;
  const missing = required.filter((k) => !env[k]);
  if (missing.length > 0 && typeof window === 'undefined') {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
  if (missing.length > 0 && typeof window !== 'undefined') {
    // avoid throwing in client, warn only
    console.warn(`Missing environment variables: ${missing.join(', ')}`);
  }
};

