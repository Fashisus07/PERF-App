import { Caso } from '../models/Caso';
import { CasoRepository } from '../repositories/CasoRepository';
import { calcularPrioridadCasoUseCase } from './CalcularPrioridadCasoUseCase';

export class ObtenerCaso {
  constructor(private readonly repo: CasoRepository) {}

  async ejecutar(id: string, umbralUrgenteDias: number = 15): Promise<Caso | undefined> {
    const caso = await this.repo.obtenerPorId(id);
    if (!caso) return undefined;
    const prio = calcularPrioridadCasoUseCase.ejecutar(caso, umbralUrgenteDias);
    return {
      ...caso,
      nivelPrioridad: prio.nivelPrioridad,
      motivoUrgencia: prio.motivoUrgencia,
      puntajePrioridad: prio.puntajePrioridad,
      esUrgente: prio.esUrgente,
    };
  }
}
