import { AnimalCaso } from '../models/Animal';
import {
  Caso,
  Coordinador,
  Especie,
  EventoHistorial,
  EstadoCaso,
  GravedadClinica,
  RegistroTestAnimal,
  RelacionAnimal,
  TestViralFijo,
  Vulnerabilidad,
} from '../models/Caso';
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

  // Coordinadores responsables y tests fijos por especie
  obtenerCoordinadores(): Promise<Coordinador[]>;
  obtenerCatalogoTests(especie?: Especie): Promise<TestViralFijo[]>;
  obtenerResultadosTests(casoId: string): Promise<RegistroTestAnimal[]>;
  guardarResultadoTest(registro: RegistroTestAnimal): Promise<RegistroTestAnimal>;

  // Relaciones familiares / de camada entre animales individuales
  obtenerRelaciones(casoId: string): Promise<RelacionAnimal[]>;
  guardarRelacion(relacion: RelacionAnimal): Promise<RelacionAnimal>;
  eliminarRelacion(relacionId: string): Promise<void>;
}
