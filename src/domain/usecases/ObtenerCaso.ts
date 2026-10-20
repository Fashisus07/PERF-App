import { Caso, conUmbral } from '../models/Caso';
import { CasoRepository } from '../repositories/CasoRepository';

export class ObtenerCaso {
  constructor(private readonly repo: CasoRepository) {}

  async ejecutar(id: string, umbralUrgenteDias: number): Promise<Caso | undefined> {
    const caso = await this.repo.obtenerPorId(id);
    return caso && conUmbral(caso, umbralUrgenteDias);
  }
}
