import AsyncStorage from '@react-native-async-storage/async-storage';
import { almacenSqlite } from './AlmacenSqlite';
import { Comparable } from './mapeo';
import { EstadoSync, ResultadoSync, sincronizar } from './MotorSincronizacion';
import { servidorSupabase } from './ServidorSupabase';
import { sincronizarFotos } from './SincronizacionFotos';

const CLAVE_BASES = 'perf.sync.bases';
const CLAVE_ULTIMA = 'perf.sync.ultimaSync';

// Qué versión de cada caso conoce este dispositivo (para mandar solo lo que cambió) y cuándo sincronizó.
const estadoAsyncStorage: EstadoSync = {
  async leerBases() {
    const raw = await AsyncStorage.getItem(CLAVE_BASES);
    return raw ? (JSON.parse(raw) as Record<string, Comparable>) : {};
  },
  async guardarBases(bases) {
    await AsyncStorage.setItem(CLAVE_BASES, JSON.stringify(bases));
  },
  async leerUltimaSync() {
    const raw = await AsyncStorage.getItem(CLAVE_ULTIMA);
    return raw ? Number(raw) : null;
  },
  async guardarUltimaSync(ms) {
    await AsyncStorage.setItem(CLAVE_ULTIMA, String(ms));
  },
};

let enCurso: Promise<ResultadoSync> | null = null;

/** Sincroniza con Supabase. Si ya hay una en curso (auto-sync + botón manual) se reutiliza. */
export function sincronizarConSupabase(): Promise<ResultadoSync> {
  if (!enCurso) {
    enCurso = sincronizar({ servidor: servidorSupabase, almacen: almacenSqlite, estado: estadoAsyncStorage })
      .then(async (resultado) => {
        // Las fotos van aparte y después de los datos: un fallo acá no invalida la sincronización.
        try {
          await sincronizarFotos();
        } catch (e) {
          console.warn('[sync] fotos:', (e as Error).message);
        }
        return resultado;
      })
      .finally(() => {
        enCurso = null;
      });
  }
  return enCurso;
}
