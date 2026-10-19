import { Caso, CambioEstado } from '../models/Caso';

export interface CasoRepository {
  obtenerActivos(): Promise<Caso[]>;
  obtenerPorId(id: string): Promise<Caso | undefined>;
  agregar(caso: Omit<Caso, 'id' | 'codigo'>): Promise<Caso>;
  actualizarEstado(id: string, cambio: CambioEstado): Promise<Caso>;
}
