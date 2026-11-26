import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { getWebDatabase } from './WebDatabase';

const DB_NAME = 'perf.db';

let _db: SQLite.SQLiteDatabase | null = null;

/**
 * Singleton de la base de datos SQLite.
 * Se abre una sola vez y se reutiliza en toda la app.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS === 'web') {
    const webDb = getWebDatabase();
    await crearTablas(webDb as unknown as SQLite.SQLiteDatabase);
    return webDb as unknown as SQLite.SQLiteDatabase;
  }

  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  try {
    await _db.execAsync('PRAGMA journal_mode = WAL;');
  } catch {}
  try {
    await _db.execAsync('PRAGMA foreign_keys = ON;');
  } catch {}
  await crearTablas(_db);
  await migrarColumnas(_db);
  return _db;
}

/**
 * Script de creación/migración.
 * Usa IF NOT EXISTS para ser idempotente.
 */
async function crearTablas(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS casos (
      id                            TEXT    PRIMARY KEY NOT NULL,
      nombre_provisorio             TEXT    NOT NULL,
      cantidad_animales             INTEGER NOT NULL DEFAULT 1,
      especie                       TEXT    NOT NULL DEFAULT 'Gato',
      edad_estimada                 TEXT,
      historia_origen               TEXT,
      personalidad                  TEXT,
      estado_visible                TEXT,
      barrio                        TEXT    NOT NULL,
      latitud                       REAL,
      longitud                      REAL,
      foto_uri                      TEXT,
      foto_local_uri                TEXT,
      foto_remote_path              TEXT,
      foto_sync_status              TEXT    NOT NULL DEFAULT 'PENDING',
      fecha_rescate                 INTEGER NOT NULL,
      quien_sigue_caso              TEXT,
      transito_nombre               TEXT,
      transito_telefono             TEXT,
      transito_correo               TEXT,
      castrado                      TEXT    NOT NULL DEFAULT 'PENDIENTE',
      virales_vif_vilef             TEXT    NOT NULL DEFAULT 'PENDIENTE',
      fecha_primera_desparasitacion INTEGER,
      fecha_segunda_desparasitacion INTEGER,
      estado_caso                   TEXT    NOT NULL DEFAULT 'EN_TRANSITO',
      gravedad_clinica              TEXT    NOT NULL DEFAULT 'MODERADA',
      vulnerabilidad                TEXT    NOT NULL DEFAULT 'ESTABLE',
      nivel_prioridad               TEXT    NOT NULL DEFAULT 'ATENCION',
      motivo_urgencia               TEXT,
      puntaje_prioridad             INTEGER NOT NULL DEFAULT 0,
      creado_por_user_id            TEXT,
      modificado_por_user_id        TEXT,
      es_urgente                    INTEGER NOT NULL DEFAULT 0,
      sync_status                   TEXT    NOT NULL DEFAULT 'PENDING',
      updated_at                    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS turnos (
      id                     TEXT    PRIMARY KEY NOT NULL,
      caso_id                TEXT    NOT NULL,
      centro_veterinario_id  TEXT,
      fecha_hora             INTEGER NOT NULL,
      motivo                 TEXT    NOT NULL,
      recordatorio_minutos   INTEGER NOT NULL DEFAULT 120,
      cumplido               INTEGER NOT NULL DEFAULT 0,
      notification_id        TEXT,
      sync_status            TEXT    NOT NULL DEFAULT 'PENDING',
      updated_at             INTEGER NOT NULL,
      FOREIGN KEY (caso_id) REFERENCES casos(id)
    );

    CREATE TABLE IF NOT EXISTS animales (
      id                            TEXT    PRIMARY KEY NOT NULL,
      caso_id                       TEXT    NOT NULL,
      nombre                        TEXT    NOT NULL,
      castrado                      TEXT    NOT NULL DEFAULT 'PENDIENTE',
      virales_vif_vilef             TEXT    NOT NULL DEFAULT 'PENDIENTE',
      embarazada                    INTEGER NOT NULL DEFAULT 0,
      peso_gramos                   INTEGER,
      fecha_primera_desparasitacion INTEGER,
      fecha_segunda_desparasitacion INTEGER,
      fallecido                     INTEGER NOT NULL DEFAULT 0,
      motivo_fallecimiento          TEXT,
      sync_status                   TEXT    NOT NULL DEFAULT 'PENDING',
      updated_at                    INTEGER NOT NULL,
      FOREIGN KEY (caso_id) REFERENCES casos(id)
    );

    CREATE TABLE IF NOT EXISTS eventos_historial (
      id           TEXT    PRIMARY KEY NOT NULL,
      caso_id      TEXT    NOT NULL,
      tipo         TEXT    NOT NULL,
      fecha        INTEGER NOT NULL,
      descripcion  TEXT    NOT NULL,
      sync_status  TEXT    NOT NULL DEFAULT 'PENDING',
      FOREIGN KEY (caso_id) REFERENCES casos(id)
    );

    CREATE TABLE IF NOT EXISTS operaciones_pendientes (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      idempotency_key TEXT,
      entidad         TEXT    NOT NULL,
      operacion       TEXT    NOT NULL,
      payload         TEXT    NOT NULL,
      reintentos      INTEGER NOT NULL DEFAULT 0,
      created_at      INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS centros_veterinarios (
      id         TEXT    PRIMARY KEY NOT NULL,
      nombre     TEXT    NOT NULL,
      medico     TEXT,
      barrio     TEXT    NOT NULL,
      direccion  TEXT    NOT NULL,
      telefono   TEXT    NOT NULL,
      detalle    TEXT,
      distancia  TEXT,
      abierto    INTEGER NOT NULL DEFAULT 1,
      tipo       TEXT    NOT NULL,
      horarios   TEXT    NOT NULL DEFAULT '["09:00","10:30","11:15","12:15","16:00","18:30"]'
    );

    CREATE TABLE IF NOT EXISTS voluntarios (
      id         TEXT    PRIMARY KEY NOT NULL,
      nombre     TEXT    NOT NULL,
      email      TEXT    NOT NULL UNIQUE,
      telefono   TEXT    NOT NULL,
      brigada    TEXT    NOT NULL,
      zona       TEXT    NOT NULL,
      clave      TEXT    NOT NULL,
      recursos   TEXT,
      created_at INTEGER NOT NULL
    );
  `);
}

/**
 * Migra columnas faltantes en bases ya creadas en dispositivos físicos o tests.
 */
async function migrarColumnas(db: SQLite.SQLiteDatabase): Promise<void> {
  const columnasCasos = [
    'ALTER TABLE casos ADD COLUMN foto_local_uri TEXT;',
    'ALTER TABLE casos ADD COLUMN foto_remote_path TEXT;',
    'ALTER TABLE casos ADD COLUMN foto_sync_status TEXT NOT NULL DEFAULT "PENDING";',
    'ALTER TABLE casos ADD COLUMN gravedad_clinica TEXT NOT NULL DEFAULT "MODERADA";',
    'ALTER TABLE casos ADD COLUMN vulnerabilidad TEXT NOT NULL DEFAULT "ESTABLE";',
    'ALTER TABLE casos ADD COLUMN nivel_prioridad TEXT NOT NULL DEFAULT "ATENCION";',
    'ALTER TABLE casos ADD COLUMN motivo_urgencia TEXT;',
    'ALTER TABLE casos ADD COLUMN puntaje_prioridad INTEGER NOT NULL DEFAULT 0;',
    'ALTER TABLE casos ADD COLUMN creado_por_user_id TEXT;',
    'ALTER TABLE casos ADD COLUMN modificado_por_user_id TEXT;',
  ];
  for (const sql of columnasCasos) {
    try {
      await db.execAsync(sql);
    } catch {}
  }

  try {
    await db.execAsync('ALTER TABLE turnos ADD COLUMN notification_id TEXT;');
  } catch {}

  try {
    await db.execAsync('ALTER TABLE operaciones_pendientes ADD COLUMN idempotency_key TEXT;');
  } catch {}
}

/**
 * Cierra la base (para tests o al cerrar la app).
 */
export async function cerrarDatabase(): Promise<void> {
  if (_db) {
    await _db.closeAsync();
    _db = null;
  }
}
