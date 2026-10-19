import { CasoRepositoryImpl } from '../../data/repositories/CasoRepositoryImpl';
import { CambiarEstadoCaso } from '../../domain/usecases/CambiarEstadoCaso';

const cambiarEstado = new CambiarEstadoCaso(new CasoRepositoryImpl());

export function useCambiarEstado() {
  return cambiarEstado;
}
