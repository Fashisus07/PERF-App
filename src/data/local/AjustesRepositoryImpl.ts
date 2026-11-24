import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ajustes, ajustesPorDefecto } from '../../domain/models/Ajustes';
import { AjustesRepository } from '../../domain/repositories/AjustesRepository';

const CLAVE = 'perf.ajustes';
export const CLAVE_THRESHOLD_ASYNC = '@perf_urgency_threshold_days';

// Preferencias simples (clave-valor) guardadas en el teléfono: no necesitan la base SQLite.
export class AjustesRepositoryImpl implements AjustesRepository {
  async obtener(): Promise<Ajustes> {
    try {
      const guardado = await AsyncStorage.getItem(CLAVE);
      const thresholdRaw = await AsyncStorage.getItem(CLAVE_THRESHOLD_ASYNC);
      
      const base = guardado ? { ...ajustesPorDefecto, ...JSON.parse(guardado) } : { ...ajustesPorDefecto };
      if (thresholdRaw != null) {
        const parsed = Number(thresholdRaw);
        if (!isNaN(parsed) && parsed > 0) {
          base.umbralUrgenteDias = parsed;
        }
      }
      return base;
    } catch {
      return ajustesPorDefecto; // si no se puede leer, se usan los valores por defecto
    }
  }

  async guardar(ajustes: Ajustes): Promise<void> {
    await AsyncStorage.setItem(CLAVE, JSON.stringify(ajustes));
    await AsyncStorage.setItem(CLAVE_THRESHOLD_ASYNC, String(ajustes.umbralUrgenteDias));
  }
}
