import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ajustes, ajustesPorDefecto } from '../../domain/models/Ajustes';
import { AjustesRepository } from '../../domain/repositories/AjustesRepository';

const CLAVE = 'perf.ajustes';

// Preferencias simples (clave-valor) guardadas en el teléfono: no necesitan la base SQLite.
export class AjustesRepositoryImpl implements AjustesRepository {
  async obtener(): Promise<Ajustes> {
    try {
      const guardado = await AsyncStorage.getItem(CLAVE);
      return guardado ? { ...ajustesPorDefecto, ...JSON.parse(guardado) } : ajustesPorDefecto;
    } catch {
      return ajustesPorDefecto; // si no se puede leer, se usan los valores por defecto
    }
  }

  async guardar(ajustes: Ajustes): Promise<void> {
    await AsyncStorage.setItem(CLAVE, JSON.stringify(ajustes));
  }
}
