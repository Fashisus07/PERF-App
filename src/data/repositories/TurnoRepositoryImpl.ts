import { Clinica, SolicitudTurno, Turno } from '../../domain/models/Turno';
import { TurnoRepository } from '../../domain/repositories/TurnoRepository';
import { clinicasMock, reservasDeOtrasGuardias, turnosIniciales } from '../mock/turnosMock';

// TODO (Mateo): reemplazar el mock por SQLite (data/local) + API (data/remote).
const turnos: Turno[] = turnosIniciales();
const otras = reservasDeOtrasGuardias();
let contador = turnos.length;

export class TurnoRepositoryImpl implements TurnoRepository {
  async obtenerTurnos(): Promise<Turno[]> {
    return turnos.map((t) => ({ ...t }));
  }

  async obtenerClinicas(): Promise<Clinica[]> {
    return clinicasMock;
  }

  async horariosOcupados(clinicaId: string): Promise<Date[]> {
    return [
      ...turnos.filter((t) => t.clinicaId === clinicaId).map((t) => t.fecha),
      ...otras.filter((o) => o.clinicaId === clinicaId).map((o) => o.fecha),
    ];
  }

  async agregar(s: SolicitudTurno, titulo: string): Promise<Turno> {
    const turno: Turno = {
      id: `t${++contador}`,
      casoId: s.casoId,
      clinicaId: s.clinicaId,
      fecha: s.fecha,
      motivo: s.motivo,
      titulo,
      notas: s.notas,
      estado: 'confirmado',
      avisos: s.avisos,
    };
    turnos.push(turno);
    return turno;
  }

  async cancelar(turnoId: string): Promise<void> {
    const i = turnos.findIndex((t) => t.id === turnoId);
    if (i >= 0) turnos.splice(i, 1);
  }
}
