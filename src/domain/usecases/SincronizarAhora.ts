import { CasoRepository } from '../repositories/CasoRepository';

export class SincronizarAhora {
  constructor(private readonly repo: CasoRepository) {}

  // Sin conexión no se intenta: los cambios siguen pendientes y se envían al recuperar la señal.
  async ejecutar(hayConexion: boolean): Promise<{ enviados: number } | { sinConexion: true }> {
    if (!hayConexion) return { sinConexion: true };
    return { enviados: await this.repo.sincronizar() };
  }
}
