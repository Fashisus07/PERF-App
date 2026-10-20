import { Clinica, SolicitudTurno, Turno } from '../models/Turno';

export interface TurnoRepository {
  obtenerTurnos(): Promise<Turno[]>;
  obtenerClinicas(): Promise<Clinica[]>;
  // Horarios ya reservados en una clínica (por esta guardia o por otras).
  horariosOcupados(clinicaId: string): Promise<Date[]>;
  agregar(solicitud: SolicitudTurno, titulo: string): Promise<Turno>;
  cancelar(turnoId: string): Promise<void>;
}
