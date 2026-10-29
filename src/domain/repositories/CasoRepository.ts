import { Caso, EventoHistorial, EstadoCaso } from '../models/Caso';
import { ResumenAlmacenamiento } from '../models/Ajustes';

export interface OperacionPendiente {
  id: number;
  entidad: string;
  operacion: string;
  payload: string;
  reintentos: number;
  created_at: number;
}

export interface CasoRepository {
  obtenerActivos(): Promise<Caso[]>;
  obtenerArchivados(): Promise<Caso[]>;
  obtenerTodos(): Promise<Caso[]>;
  obtenerPorId(id: string): Promise<Caso | undefined>;
  agregar(caso: Caso): Promise<Caso>;
  actualizar(caso: Caso): Promise<Caso>;
  actualizarEstado(id: string, nuevoEstado: EstadoCaso, motivo?: string): Promise<Caso>;
  resumenAlmacenamiento(): Promise<ResumenAlmacenamiento>;
  sincronizar(): Promise<number>;
  obtenerOperacionesPendientes(): Promise<OperacionPendiente[]>;

  // Historial de eventos
  obtenerHistorial(casoId: string): Promise<EventoHistorial[]>;
  agregarEvento(evento: EventoHistorial): Promise<void>;
}
