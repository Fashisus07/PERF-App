import { Caso } from '../models/Caso';
import { CasoRepository } from '../repositories/CasoRepository';
import { calcularPrioridadCasoUseCase } from './CalcularPrioridadCasoUseCase';

export class ListarCasosPorUrgencia {
  constructor(private readonly repo: CasoRepository) {}

  async ejecutar(umbralUrgenteDias: number = 15): Promise<Caso[]> {
    const casos = await this.repo.obtenerActivos();
    return casos.slice().sort((a, b) => {
      const prioA = calcularPrioridadCasoUseCase.ejecutar(a, umbralUrgenteDias);
      const prioB = calcularPrioridadCasoUseCase.ejecutar(b, umbralUrgenteDias);
      if (prioB.puntajePrioridad !== prioA.puntajePrioridad) {
        return prioB.puntajePrioridad - prioA.puntajePrioridad;
      }
      return b.fechaRescate - a.fechaRescate;
    });
  }
}
