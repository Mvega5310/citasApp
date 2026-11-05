import type { DataStore } from './types';
import { firestoreStore } from './firestore';
import { postgresStore } from './postgres';
import { isFirebaseConfigured } from '../firebaseAdmin';
import { isPostgresConfigured } from '../pg';

export * from './types';

/** Almacenamiento elegido con DATA_BACKEND: "firestore" (por defecto) o "postgres". */
export function dataBackend(): 'firestore' | 'postgres' {
  return (process.env.DATA_BACKEND || '').toLowerCase() === 'postgres' ? 'postgres' : 'firestore';
}

export function store(): DataStore {
  return dataBackend() === 'postgres' ? postgresStore : firestoreStore;
}

/** ¿Está configurado el almacenamiento activo? */
export function isStoreConfigured(): boolean {
  return dataBackend() === 'postgres' ? isPostgresConfigured() : isFirebaseConfigured;
}
