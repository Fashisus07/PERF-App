import { TurnoRepository } from '../repositories/TurnoRepository';
import { RecordatorioTurnos } from '../services/RecordatorioTurnos';

export class CancelarTurno {
  constructor(private readonly repo: TurnoRepository, private readonly recordatorios: RecordatorioTurnos) {}

  async ejecutar(turnoId: string) {
    await this.repo.cancelar(turnoId);
    await this.recordatorios.cancelar(turnoId);
  }
}
