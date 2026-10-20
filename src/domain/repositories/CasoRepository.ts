import { ResumenAlmacenamiento } from '../models/Ajustes';
import { Caso, CambioEstado } from '../models/Caso';

export interface CasoRepository {
  obtenerActivos(): Promise<Caso[]>;
  obtenerPorId(id: string): Promise<Caso | undefined>;
  agregar(caso: Omit<Caso, 'id' | 'codigo'>): Promise<Caso>;
  resumenAlmacenamiento(): Promise<ResumenAlmacenamiento>;
  // Envía los cambios pendientes al servidor. Devuelve cuántos casos estaban pendientes.
  sincronizar(): Promise<number>;
  actualizarEstado(id: string, cambio: CambioEstado): Promise<Caso>;
}
