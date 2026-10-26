import { Caso } from '../models/Caso';
import { CasoRepository } from '../repositories/CasoRepository';

export class ObtenerCaso {
  constructor(private readonly repo: CasoRepository) {}

  async ejecutar(id: string): Promise<Caso | undefined> {
    return this.repo.obtenerPorId(id);
  }
}
