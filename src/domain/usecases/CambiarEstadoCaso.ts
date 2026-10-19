import { Caso, CambioEstado, EstadoCaso } from '../models/Caso';
import { CasoRepository } from '../repositories/CasoRepository';

// Al derivar a un hogar de tránsito o a una clínica hay que indicar adónde va.
export const estadoRequiereDestino = (estado: EstadoCaso) => estado === 'transito' || estado === 'tratamiento';

export class CambiarEstadoCaso {
  constructor(private readonly repo: CasoRepository) {}

  ejecutar(id: string, cambio: CambioEstado): Promise<Caso> {
    if (!cambio.motivo.trim()) throw new Error('El motivo es obligatorio');
    if (estadoRequiereDestino(cambio.estado) && !cambio.destino?.trim()) {
      throw new Error('El destino es obligatorio para este estado');
    }
    return this.repo.actualizarEstado(id, cambio);
  }
}
