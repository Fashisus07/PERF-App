import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DbEjecutable {
  runAsync(sql: string, params?: any[] | Record<string, any>): Promise<unknown>;
}

const CLAVE_MODO_DEMO = '@perf_modo_demo';
const CLAVE_DEMO_SEMBRADO = '@perf_demo_sembrado';

/** IDs prefijos o conocidos usados únicamente por los datos de ejemplo del Modo Demo. */
export const PREFIJO_ID_DEMO = 'demo-';

let cacheModoDemo: boolean | null = null;

/** Indica si la sesión actual es el Modo Demo (único modo que usa mocks precargados). */
export async function esModoDemo(): Promise<boolean> {
  if (cacheModoDemo !== null) return cacheModoDemo;
  try {
    const v = await AsyncStorage.getItem(CLAVE_MODO_DEMO);
    cacheModoDemo = v === '1';
    return cacheModoDemo;
  } catch {
    return false;
  }
}

export async function activarModoDemo(activo: boolean): Promise<void> {
  cacheModoDemo = activo;
  try {
    if (activo) {
      await AsyncStorage.setItem(CLAVE_MODO_DEMO, '1');
    } else {
      await AsyncStorage.multiRemove([CLAVE_MODO_DEMO, CLAVE_DEMO_SEMBRADO]);
    }
  } catch {
    // ignorar fallos transitorios de AsyncStorage
  }
}

export async function yaSeSembraronMocksDemo(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CLAVE_DEMO_SEMBRADO)) === '1';
  } catch {
    return false;
  }
}

export async function marcarMocksDemoSembrados(): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE_DEMO_SEMBRADO, '1');
  } catch {
    // ignorar
  }
}

/**
 * Elimina de SQLite cualquier caso, turno o clínica perteneciente a los datos mock de Demo
 * para garantizar que el arranque real de la aplicación inicie completamente limpio.
 */
export async function purgarDatosDemoDeDb(
  db: DbEjecutable,
  idsCasosDemo: readonly string[] = [],
  idsClinicasDemo: readonly string[] = []
): Promise<void> {
  try {
    await db.runAsync('DELETE FROM casos WHERE id LIKE ?', [`${PREFIJO_ID_DEMO}%`]);
    for (const id of idsCasosDemo) {
      await db.runAsync('DELETE FROM relaciones_animales WHERE caso_origen_id = ?', [id]);
      await db.runAsync('DELETE FROM relaciones_animales WHERE caso_destino_id = ?', [id]);
      await db.runAsync('DELETE FROM resultados_tests_animal WHERE caso_id = ?', [id]);
      await db.runAsync('DELETE FROM eventos_historial WHERE caso_id = ?', [id]);
      await db.runAsync('DELETE FROM animales WHERE caso_id = ?', [id]);
      await db.runAsync('DELETE FROM turnos WHERE caso_id = ?', [id]);
      await db.runAsync('DELETE FROM casos WHERE id = ?', [id]);
    }
    for (const cid of idsClinicasDemo) {
      await db.runAsync('DELETE FROM centros_veterinarios WHERE id = ?', [cid]);
    }
    await db.runAsync('DELETE FROM turnos WHERE id LIKE ?', ['turno-%']);
    await db.runAsync('DELETE FROM turnos WHERE id LIKE ?', ['t-%']);
    await AsyncStorage.removeItem(CLAVE_DEMO_SEMBRADO);
  } catch {
    // la limpieza es defensiva y no debe bloquear el login
  }
}

/** Para tests unitarios. */
export function resetCacheModoDemoParaTest(): void {
  cacheModoDemo = null;
}
