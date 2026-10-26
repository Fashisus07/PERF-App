import { Clinica, SolicitudTurno, Turno } from '../models/Turno';

export interface TurnoRepository {
  obtenerTurnos(): Promise<Turno[]>;
  obtenerPorCasoId(casoId: string): Promise<Turno[]>;
  obtenerClinicas(): Promise<Clinica[]>;
  horariosOcupados(clinicaId: string): Promise<Date[]>;
  agregar(solicitud: SolicitudTurno, titulo?: string): Promise<Turno>;
  marcarCumplido(turnoId: string): Promise<Turno>;
  cancelar(turnoId: string): Promise<void>;
  sincronizar(): Promise<number>;
}
