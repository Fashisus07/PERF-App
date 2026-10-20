import { Ajustes } from '../models/Ajustes';

export interface AjustesRepository {
  obtener(): Promise<Ajustes>;
  guardar(ajustes: Ajustes): Promise<void>;
}
