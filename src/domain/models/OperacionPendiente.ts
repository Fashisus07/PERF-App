// Cola Offline First: operaciones que no pudieron sincronizarse con el backend.

export type EntidadPendiente = 'CASO' | 'TURNO' | 'HISTORIAL';
export type TipoOperacion = 'CREATE' | 'UPDATE' | 'DELETE';

export interface OperacionPendiente {
  id: number; // AUTOINCREMENT
  entidad: EntidadPendiente;
  operacion: TipoOperacion;
  payload: string; // JSON serializado
  reintentos: number;
  createdAt: number; // Timestamp
}
