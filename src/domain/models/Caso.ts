// ─── Tipos enumerados alineados con la planilla operativa PERF ───

export type Especie = 'Gato' | 'Perro' | 'Otro';

export type EstadoCaso =
  | 'EN_TRANSITO'
  | 'EN_CLINICA'
  | 'EN_ADOPCION'
  | 'PRE_ADOPTADO'
  | 'ADOPTADO'
  | 'FALLECIDO';

export type EstadoCastracion = 'SI' | 'NO' | 'PENDIENTE';

export type EstadoVirales =
  | 'PENDIENTE'
  | 'NEGATIVO'
  | 'VIF_POSITIVO'
  | 'VILEF_POSITIVO'
  | 'AMBOS_POSITIVOS';

export type SyncStatus = 'PENDING' | 'SYNCED';

// ─── Value Objects ───

export interface HogarTransito {
  nombre: string;
  telefono: string;
  correo?: string;
}

export interface FichaSanitariaFelina {
  castrado: EstadoCastracion;
  virales: EstadoVirales;
  fechaPrimeraDesparasitacion?: number | null;
  fechaSegundaDesparasitacion?: number | null;
}

// ─── Entidad principal ───

export interface Caso {
  id: string; // UUID generado localmente
  nombreProvisorio: string;
  cantidadAnimales: number;
  especie: Especie;
  edadEstimada: string;
  historiaOrigen: string;
  personalidad: string;
  estadoVisible: string; // Condición física preliminar
  barrio: string;
  coordenadas?: {
    latitud: number;
    longitud: number;
  } | null;
  fotoUri?: string | null;
  fechaRescate: number; // Timestamp
  quienSigueCaso: string;
  transito: HogarTransito;
  sanidad: FichaSanitariaFelina;
  estadoCaso: EstadoCaso;
  esUrgente: boolean;
  syncStatus: SyncStatus;
  updatedAt: number; // Timestamp
}

// ─── Etiquetas de UI ───

export const ETIQUETA_ESTADO: Record<EstadoCaso, string> = {
  EN_TRANSITO: 'En tránsito',
  EN_CLINICA: 'En clínica',
  EN_ADOPCION: 'En adopción',
  PRE_ADOPTADO: 'Pre-adoptado',
  ADOPTADO: 'Adoptado',
  FALLECIDO: 'Fallecido',
};

export const ETIQUETA_ESPECIE: Record<Especie, string> = {
  Gato: 'Gato',
  Perro: 'Perro',
  Otro: 'Otro',
};

export const ETIQUETA_CASTRACION: Record<EstadoCastracion, string> = {
  SI: 'Castrado',
  NO: 'No castrado',
  PENDIENTE: 'Pendiente',
};

export const ETIQUETA_VIRALES: Record<EstadoVirales, string> = {
  PENDIENTE: 'Pendiente',
  NEGATIVO: 'Negativo',
  VIF_POSITIVO: 'VIF Positivo',
  VILEF_POSITIVO: 'ViLeF Positivo',
  AMBOS_POSITIVOS: 'VIF + ViLeF Positivo',
};

// ─── Coordinadores de PERF ───

export const COORDINADORES_PERF = ['Cami', 'Juli', 'Martu', 'Nay'] as const;

// ─── Urgencia ───

export type Urgencia = 'urgente' | 'atencion' | 'aldia';

/**
 * Calcula el nivel de urgencia de un caso a partir de los días transcurridos desde el rescate.
 * Reglas:
 *  - `esUrgente = true` (marcado manualmente) → siempre 'urgente'.
 *  - Más de `umbral` días desde el rescate → 'urgente'.
 *  - Más de `umbral / 2` días → 'atencion'.
 *  - Caso contrario → 'aldia'.
 */
export function calcularUrgencia(caso: Caso, umbralDias: number): Urgencia {
  if (caso.esUrgente) return 'urgente';
  const diasEnEspera = Math.floor((Date.now() - caso.fechaRescate) / (1000 * 60 * 60 * 24));
  if (diasEnEspera > umbralDias) return 'urgente';
  if (diasEnEspera > umbralDias / 2) return 'atencion';
  return 'aldia';
}

/** Días transcurridos desde el rescate. */
export function diasEnEspera(caso: Caso): number {
  return Math.max(0, Math.floor((Date.now() - caso.fechaRescate) / (1000 * 60 * 60 * 24)));
}

/** Descripción corta para tarjetas: "Gato · 45 días" */
export function descripcionCorta(caso: Caso): string {
  return [ETIQUETA_ESPECIE[caso.especie], caso.edadEstimada].filter(Boolean).join(' · ');
}

// ─── Historial del caso ───

export type TipoEvento =
  | 'LLEGADA'
  | 'VISITA_VETERINARIA'
  | 'CAMBIO_TRANSITO'
  | 'DESPARASITACION'
  | 'CIRUGIA'
  | 'ADOPCION';

export interface EventoHistorial {
  id: string;
  casoId: string;
  tipo: TipoEvento;
  fecha: number;
  descripcion: string;
  syncStatus: SyncStatus;
}

export const ETIQUETA_EVENTO: Record<TipoEvento, string> = {
  LLEGADA: 'Llegada / Rescate',
  VISITA_VETERINARIA: 'Visita veterinaria',
  CAMBIO_TRANSITO: 'Cambio de tránsito',
  DESPARASITACION: 'Desparasitación',
  CIRUGIA: 'Cirugía',
  ADOPCION: 'Adopción',
};
