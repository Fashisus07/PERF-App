import { Caso, Urgencia } from '../models/Caso';
import { CasoRepository } from '../repositories/CasoRepository';

const ORDEN: Record<Urgencia, number> = { urgente: 0, atencion: 1, aldia: 2 };

export class ListarCasosPorUrgencia {
  constructor(private readonly repo: CasoRepository) {}

  async ejecutar(): Promise<Caso[]> {
    const casos = await this.repo.obtenerActivos();
    return [...casos].sort(
      (a, b) => ORDEN[a.urgencia] - ORDEN[b.urgencia] || b.diasEnEspera - a.diasEnEspera,
    );
  }
}
