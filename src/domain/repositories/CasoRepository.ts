import { Caso, EventoHistorial, EstadoCaso } from '../models/Caso';
import { ResumenAlmacenamiento } from '../models/Ajustes';

export interface CasoRepository {
  obtenerActivos(): Promise<Caso[]>;
  obtenerPorId(id: string): Promise<Caso | undefined>;
  agregar(caso: Caso): Promise<Caso>;
  actualizar(caso: Caso): Promise<Caso>;
  actualizarEstado(id: string, nuevoEstado: EstadoCaso, motivo?: string): Promise<Caso>;
  resumenAlmacenamiento(): Promise<ResumenAlmacenamiento>;
  sincronizar(): Promise<number>;

  // Historial de eventos
  obtenerHistorial(casoId: string): Promise<EventoHistorial[]>;
  agregarEvento(evento: EventoHistorial): Promise<void>;
}
