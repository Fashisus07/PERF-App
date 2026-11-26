// Borrador para el formulario de alta (Nuevo rescate).
// Los datos provisorios se van completando en los pasos del asistente y
// se convierten en un Caso al momento de persistir en SQLite.

import {
  Especie,
  EstadoCastracion,
  EstadoVirales,
  GravedadClinica,
  ResultadoTestViral,
  TipoRelacionAnimal,
  Vulnerabilidad,
} from './Caso';

export type Coordenadas = { latitud: number; longitud: number };

export interface BorradorRelacion {
  tipoRelacion: TipoRelacionAnimal;
  casoDestinoId?: string | null;
  nombreDestino: string;
}

export interface BorradorRescate {
  fotoUri?: string | null;
  nombreProvisorio: string;
  cantidadAnimales: number;
  especie: Especie | null;
  especieDetalle?: string;
  edadEstimada: string;
  historiaOrigen: string;
  personalidad: string;
  estadoVisible: string;
  barrio: string;
  coordenadas?: Coordenadas | null;
  quienSigueCaso: string;
  coordinadorId?: string | null;
  transitoNombre: string;
  transitoTelefono: string;
  transitoCorreo?: string;
  castrado: EstadoCastracion;
  virales: EstadoVirales;
  resultadosTests?: Record<string, ResultadoTestViral>;
  relacionesIniciales?: BorradorRelacion[];
  fechaPrimeraDesparasitacion?: number | null;
  fechaSegundaDesparasitacion?: number | null;
  gravedadClinica: GravedadClinica;
  vulnerabilidad: Vulnerabilidad;
  esUrgente: boolean;
}

export const borradorVacio = (): BorradorRescate => ({
  fotoUri: null,
  nombreProvisorio: '',
  cantidadAnimales: 1,
  especie: 'Gato',
  especieDetalle: '',
  edadEstimada: '',
  historiaOrigen: '',
  personalidad: '',
  estadoVisible: '',
  barrio: '',
  coordenadas: null,
  quienSigueCaso: 'Cami',
  coordinadorId: null,
  transitoNombre: '',
  transitoTelefono: '',
  transitoCorreo: '',
  castrado: 'PENDIENTE',
  virales: 'PENDIENTE',
  resultadosTests: {},
  relacionesIniciales: [],
  fechaPrimeraDesparasitacion: null,
  fechaSegundaDesparasitacion: null,
  gravedadClinica: 'MODERADA',
  vulnerabilidad: 'ESTABLE',
  esUrgente: false,
});

// ─── Validaciones del asistente ───

export function faltantesDelRescate(b: BorradorRescate): string[] {
  const faltan: string[] = [];
  if (!b.nombreProvisorio.trim()) faltan.push('el nombre provisorio');
  if (!b.especie) faltan.push('la especie');
  if (b.especie === 'Otro' && !b.especieDetalle?.trim()) faltan.push('qué animal doméstico es');
  if (!b.barrio.trim()) faltan.push('el barrio del rescate');
  return faltan;
}

export function formatoFecha(d: Date): string {
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

export { ETIQUETA_ESPECIE } from './Caso';
