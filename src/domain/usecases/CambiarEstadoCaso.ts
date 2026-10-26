import { Caso, EstadoCaso } from '../models/Caso';
import { CasoRepository } from '../repositories/CasoRepository';

export interface SolicitudCambioEstado {
  estado: EstadoCaso;
  motivo: string;
  destino?: string;
  sinConexion?: boolean;
}

// Al derivar a un hogar de tránsito o a una clínica hay que indicar adónde va o el motivo.
export const estadoRequiereDestino = (estado: EstadoCaso): boolean =>
  estado === 'EN_TRANSITO' || estado === 'EN_CLINICA';

export class CambiarEstadoCaso {
  constructor(private readonly repo: CasoRepository) {}

  async ejecutar(id: string, cambio: SolicitudCambioEstado): Promise<Caso> {
    if (!cambio.motivo.trim()) {
      throw new Error('El motivo es obligatorio');
    }
    const detalle = cambio.destino?.trim()
      ? `${cambio.motivo.trim()} (Destino: ${cambio.destino.trim()})`
      : cambio.motivo.trim();

    return this.repo.actualizarEstado(id, cambio.estado, detalle);
  }
}
