import { AnimalCaso } from '../models/Animal';
import { Caso, EventoHistorial, EstadoCaso, GravedadClinica, Vulnerabilidad } from '../models/Caso';
import { ResumenAlmacenamiento } from '../models/Ajustes';

export interface OpcionesActualizacionEstado {
  destino?: string;
  gravedadClinica?: GravedadClinica;
  vulnerabilidad?: Vulnerabilidad;
  umbralDias?: number;
}

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
  actualizarEstado(
    id: string,
    nuevoEstado: EstadoCaso,
    motivo?: string,
    opciones?: OpcionesActualizacionEstado
  ): Promise<Caso>;
  resumenAlmacenamiento(): Promise<ResumenAlmacenamiento>;
  sincronizar(): Promise<number>;
  obtenerOperacionesPendientes(): Promise<OperacionPendiente[]>;

  // Animales del caso (ficha sanitaria individual)
  obtenerAnimales(casoId: string): Promise<AnimalCaso[]>;
  /** Guarda la ficha de un animal y recalcula la sanidad resumen del caso. */
  actualizarAnimal(animal: AnimalCaso): Promise<AnimalCaso>;

  // Historial de eventos
  obtenerHistorial(casoId: string): Promise<EventoHistorial[]>;
  agregarEvento(evento: EventoHistorial): Promise<void>;
}
