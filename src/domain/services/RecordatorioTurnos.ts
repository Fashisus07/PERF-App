import { Clinica, Turno } from '../models/Turno';

/**
 * Puerto: el dominio solicita programar o cancelar alarmas/notificaciones de turnos
 * sin acoplarse a la implementación específica de Expo Notifications.
 */
export interface RecordatorioTurnos {
  programar(turno: Turno, clinica?: Clinica, nombreCaso?: string): Promise<boolean>;
  cancelar(turnoId: string): Promise<void>;
}
