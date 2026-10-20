import { AvisoTurno, Clinica, Turno } from '../models/Turno';

// Puerto: el dominio pide recordatorios sin saber cómo se programan en el dispositivo.
export interface RecordatorioTurnos {
  // Devuelve los avisos que quedaron programados. Vacío si no se pudo (ej: el usuario negó el permiso
  // de notificaciones) o si todos caían en un momento que ya pasó.
  programar(turno: Turno, clinica: Clinica, nombreCaso: string): Promise<AvisoTurno[]>;
  cancelar(turnoId: string): Promise<void>;
}
