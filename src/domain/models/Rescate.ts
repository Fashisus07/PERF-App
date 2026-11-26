// Borrador para el formulario de alta (Nuevo rescate).
// Los datos provisorios se van completando en los pasos del asistente y
// se convierten en un Caso al momento de persistir en SQLite.

import {
  Especie,
  EstadoCastracion,
  EstadoVirales,
  GravedadClinica,
  Vulnerabilidad,
} from './Caso';

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
  gravedadClinica: GravedadClinica;
  vulnerabilidad: Vulnerabilidad;
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
  gravedadClinica: 'MODERADA',
  vulnerabilidad: 'ESTABLE',
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

/** Fecha corta "dd/mm/aa", para mostrar fechas fijas (no relativas) sin que se corten en tarjetas angostas. */
export function formatoFechaCorta(fecha: number | string | Date): string {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const aa = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${aa}`;
}

/** Igual que formatoFechaCorta, agregando la hora: "dd/mm/aa hh:mm". */
export function formatoFechaHoraCorta(fecha: number | string | Date): string {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${formatoFechaCorta(d)} ${hh}:${min}`;
}

export { ETIQUETA_ESPECIE } from './Caso';
