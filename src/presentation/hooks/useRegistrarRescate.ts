import { useCasoStore } from '../stores/useCasoStore';
import { BorradorRescate } from '../../domain/models/Rescate';
import { Caso } from '../../domain/models/Caso';

export function useRegistrarRescate() {
  const registrar = useCasoStore((s) => s.registrarRescate);
  return {
    ejecutar: (b: BorradorRescate, sinConexion: boolean = false): Promise<Caso> =>
      registrar(b, sinConexion),
  };
}
