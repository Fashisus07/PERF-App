import { CasoRepositoryImpl } from '../../data/repositories/CasoRepositoryImpl';
import { RegistrarRescate } from '../../domain/usecases/RegistrarRescate';

const registrarRescate = new RegistrarRescate(new CasoRepositoryImpl());

export function useRegistrarRescate() {
  return registrarRescate;
}
