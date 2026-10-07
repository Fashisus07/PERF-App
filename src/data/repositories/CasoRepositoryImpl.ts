import { Caso } from '../../domain/models/Caso';
import { CasoRepository } from '../../domain/repositories/CasoRepository';
import { casosMock } from '../mock/casosMock';

// TODO (Mateo): reemplazar el mock por SQLite (data/local) + API (data/remote).
export class CasoRepositoryImpl implements CasoRepository {
  async obtenerActivos(): Promise<Caso[]> {
    return casosMock;
  }
}
