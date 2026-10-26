import { Caso, calcularUrgencia, diasEnEspera, Urgencia } from '../models/Caso';
import { CasoRepository } from '../repositories/CasoRepository';

const ORDEN: Record<Urgencia, number> = { urgente: 0, atencion: 1, aldia: 2 };

export class ListarCasosPorUrgencia {
  constructor(private readonly repo: CasoRepository) {}

  async ejecutar(umbralUrgenteDias: number = 10): Promise<Caso[]> {
    const casos = await this.repo.obtenerActivos();
    return casos.slice().sort((a, b) => {
      const urgA = calcularUrgencia(a, umbralUrgenteDias);
      const urgB = calcularUrgencia(b, umbralUrgenteDias);
      const ordenDiff = ORDEN[urgA] - ORDEN[urgB];
      if (ordenDiff !== 0) return ordenDiff;
      return diasEnEspera(b) - diasEnEspera(a);
    });
  }
}
