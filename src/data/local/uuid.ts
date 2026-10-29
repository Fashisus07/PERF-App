import * as Crypto from 'expo-crypto';

/** Genera un UUID v4 compatible con el esquema SQLite. */
export function generarUUID(): string {
  try {
    if (typeof Crypto?.randomUUID === 'function') {
      return Crypto.randomUUID();
    }
  } catch {}

  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {}
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
