import { Urgencia } from './Caso';

export type Especie = 'gato' | 'perro' | 'otro';
export type EdadEstimada = 'cachorro' | 'joven' | 'adulto' | 'senior';
export type Triaje = 'sano' | 'desnutrido' | 'herida' | 'urgente';

export const ETIQUETA_ESPECIE: Record<Especie, string> = { gato: 'Gato', perro: 'Perro', otro: 'Otro' };
export const ETIQUETA_EDAD: Record<EdadEstimada, string> = {
  cachorro: 'Cachorro / Lactante',
  joven: 'Joven (6 a 12 m)',
  adulto: 'Adulto',
  senior: 'Senior (+8 años)',
};
export const ETIQUETA_TRIAJE: Record<Triaje, string> = {
  sano: 'Aparentemente sano',
  desnutrido: 'Desnutrido / Flaco',
  herida: 'Herida visible',
  urgente: 'Urgente veterinario',
};

export type Coordenadas = { lat: number; lng: number };

// Datos que se van cargando en los 3 pasos de "Nuevo rescate".
export type BorradorRescate = {
  fotoUri?: string;
  nombre: string;
  especie: Especie | null;
  edad: EdadEstimada | null;
  triaje: Triaje[];
  notas: string;
  fecha: string; // ISO
  barrio: string;
  lugar: string; // calle o referencia
  coordenadas?: Coordenadas;
};

export const borradorVacio = (): BorradorRescate => ({
  nombre: '',
  especie: null,
  edad: null,
  triaje: [],
  notas: '',
  fecha: new Date().toISOString(),
  barrio: '',
  lugar: '',
});

// Cuánta urgencia tiene el caso según lo que se vio en campo.
export function urgenciaDeTriaje(triaje: Triaje[]): Urgencia {
  if (triaje.includes('urgente')) return 'urgente';
  if (triaje.includes('desnutrido') || triaje.includes('herida')) return 'atencion';
  return 'aldia';
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
// ej: "24 Feb 2025"
export const formatoFecha = (d: Date) => `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
