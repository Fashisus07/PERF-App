import { Caso } from '../models/Caso';

export interface CasoRepository {
  obtenerActivos(): Promise<Caso[]>;
}
