import { Caso } from '../models/Caso';
import { CasoRepository } from '../repositories/CasoRepository';
import { calcularPrioridadCasoUseCase } from './CalcularPrioridadCasoUseCase';

export class ListarCasosPorUrgencia {
  constructor(private readonly repo: CasoRepository) {}

  async ejecutar(umbralUrgenteDias: number = 15): Promise<Caso[]> {
    const casos = await this.repo.obtenerActivos();
    const conPrioridadActualizada = casos.map((c) => {
      const prio = calcularPrioridadCasoUseCase.ejecutar(c, umbralUrgenteDias);
      return {
        ...c,
        nivelPrioridad: prio.nivelPrioridad,
        motivoUrgencia: prio.motivoUrgencia,
        puntajePrioridad: prio.puntajePrioridad,
        esUrgente: prio.esUrgente,
      };
    });

    return conPrioridadActualizada.sort((a, b) => {
      if (b.puntajePrioridad !== a.puntajePrioridad) {
        return b.puntajePrioridad - a.puntajePrioridad;
      }
      return b.fechaRescate - a.fechaRescate;
    });
  }
}
