import { useCasoStore } from '../stores/useCasoStore';
import { EstadoCaso } from '../../domain/models/Caso';

export interface ParametrosCambioEstado {
  estado: EstadoCaso;
  motivo: string;
  destino?: string;
  sinConexion?: boolean;
}

export function useCambiarEstado() {
  const cambiar = useCasoStore((s) => s.cambiarEstado);
  return {
    ejecutar: (id: string, cambio: ParametrosCambioEstado) =>
      cambiar(id, cambio.estado, cambio.motivo, cambio.destino),
  };
}
