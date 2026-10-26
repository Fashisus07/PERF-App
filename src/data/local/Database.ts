import * as SQLite from 'expo-sqlite';

const DB_NAME = 'perf.db';

let _db: SQLite.SQLiteDatabase | null = null;

/**
 * Singleton de la base de datos SQLite.
 * Se abre una sola vez y se reutiliza en toda la app.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await _db.execAsync('PRAGMA journal_mode = WAL;');
  await _db.execAsync('PRAGMA foreign_keys = ON;');
  await crearTablas(_db);
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
      sync_status            TEXT    NOT NULL DEFAULT 'PENDING',
      updated_at             INTEGER NOT NULL,
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
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      entidad    TEXT    NOT NULL,
      operacion  TEXT    NOT NULL,
      payload    TEXT    NOT NULL,
      reintentos INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
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
