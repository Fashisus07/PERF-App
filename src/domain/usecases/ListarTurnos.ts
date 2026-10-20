import { Clinica, Turno } from '../models/Turno';
import { TurnoRepository } from '../repositories/TurnoRepository';

export class ListarTurnos {
  constructor(private readonly repo: TurnoRepository) {}

  // Turnos que todavía no pasaron, del más próximo al más lejano.
  async ejecutar(ahora = new Date()): Promise<{ turnos: Turno[]; clinicas: Clinica[] }> {
    const [turnos, clinicas] = await Promise.all([this.repo.obtenerTurnos(), this.repo.obtenerClinicas()]);
    const inicioDeHoy = new Date(ahora);
    inicioDeHoy.setHours(0, 0, 0, 0);
    return {
      turnos: turnos.filter((t) => t.fecha.getTime() >= inicioDeHoy.getTime()).sort((a, b) => a.fecha.getTime() - b.fecha.getTime()),
      clinicas,
    };
  }
}
