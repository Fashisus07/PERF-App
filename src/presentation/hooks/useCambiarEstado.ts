import { useCasoStore } from '../stores/useCasoStore';
import { EstadoCaso, GravedadClinica, Vulnerabilidad } from '../../domain/models/Caso';

export interface ParametrosCambioEstado {
  estado: EstadoCaso;
  motivo: string;
  destino?: string;
  gravedadClinica?: GravedadClinica;
  vulnerabilidad?: Vulnerabilidad;
  sinConexion?: boolean;
}

export function useCambiarEstado() {
  const cambiar = useCasoStore((s) => s.cambiarEstado);
  return {
    ejecutar: (id: string, cambio: ParametrosCambioEstado) =>
      cambiar(id, cambio.estado, cambio.motivo, {
        destino: cambio.destino,
        gravedadClinica: cambio.gravedadClinica,
        vulnerabilidad: cambio.vulnerabilidad,
      }),
  };
}
