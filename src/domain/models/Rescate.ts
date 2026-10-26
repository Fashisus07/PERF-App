// Borrador para el formulario de alta (Nuevo rescate).
// Los datos provisorios se van completando en los pasos del asistente y
// se convierten en un Caso al momento de persistir en SQLite.

import { Especie, EstadoCastracion, EstadoVirales } from './Caso';

export type Coordenadas = { latitud: number; longitud: number };

export interface BorradorRescate {
  fotoUri?: string | null;
  nombreProvisorio: string;
  cantidadAnimales: number;
  especie: Especie | null;
  edadEstimada: string;
  historiaOrigen: string;
  personalidad: string;
  estadoVisible: string;
  barrio: string;
  coordenadas?: Coordenadas | null;
  quienSigueCaso: string;
  transitoNombre: string;
  transitoTelefono: string;
  transitoCorreo?: string;
  castrado: EstadoCastracion;
  virales: EstadoVirales;
  fechaPrimeraDesparasitacion?: number | null;
  fechaSegundaDesparasitacion?: number | null;
  esUrgente: boolean;
}

export const borradorVacio = (): BorradorRescate => ({
  fotoUri: null,
  nombreProvisorio: '',
  cantidadAnimales: 1,
  especie: 'Gato',
  edadEstimada: '',
  historiaOrigen: '',
  personalidad: '',
  estadoVisible: '',
  barrio: '',
  coordenadas: null,
  quienSigueCaso: 'Cami',
  transitoNombre: '',
  transitoTelefono: '',
  transitoCorreo: '',
  castrado: 'PENDIENTE',
  virales: 'PENDIENTE',
  fechaPrimeraDesparasitacion: null,
  fechaSegundaDesparasitacion: null,
  esUrgente: false,
});

// ─── Validaciones del asistente ───

export function faltantesDelRescate(b: BorradorRescate): string[] {
  const faltan: string[] = [];
  if (!b.nombreProvisorio.trim()) faltan.push('el nombre provisorio');
  if (!b.especie) faltan.push('la especie');
  if (!b.barrio.trim()) faltan.push('el barrio del rescate');
  return faltan;
}

export function formatoFecha(d: Date): string {
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

export { ETIQUETA_ESPECIE } from './Caso';

