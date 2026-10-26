import * as Crypto from 'expo-crypto';

/** Genera un UUID v4 compatible con el esquema SQLite. */
export function generarUUID(): string {
  return Crypto.randomUUID();
}
