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

// ─── Nuevos criterios de priorización multicriterio ───

export type GravedadClinica = 'CRITICA' | 'MODERADA' | 'LEVE' | 'SANA';

export type Vulnerabilidad =
  | 'LACTANTE_SIN_MADRE'
  | 'SIN_TRANSITO'
  | 'EN_TRATAMIENTO'
  | 'ESTABLE';

export type NivelPrioridad = 'URGENTE' | 'ATENCION' | 'AL_DIA';

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
  fotoLocalUri?: string | null;
  fotoRemotePath?: string | null;
  fotoSyncStatus?: 'PENDING' | 'SYNCED' | 'FAILED';
  fechaRescate: number; // Timestamp
  quienSigueCaso: string;
  transito: HogarTransito;
  sanidad: FichaSanitariaFelina;
  estadoCaso: EstadoCaso;
  gravedadClinica: GravedadClinica;
  vulnerabilidad: Vulnerabilidad;
  nivelPrioridad: NivelPrioridad;
  motivoUrgencia: string;
  puntajePrioridad: number;
  creadoPorUserId?: string;
  modificadoPorUserId?: string;
  esUrgente: boolean; // Retrocompatibilidad
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

export const ETIQUETA_GRAVEDAD: Record<GravedadClinica, string> = {
  CRITICA: 'Crítica',
  MODERADA: 'Moderada',
  LEVE: 'Leve',
  SANA: 'Sana',
};

export const ETIQUETA_VULNERABILIDAD: Record<Vulnerabilidad, string> = {
  LACTANTE_SIN_MADRE: 'Lactante sin madre',
  SIN_TRANSITO: 'Sin tránsito asignado',
  EN_TRATAMIENTO: 'En tratamiento activo',
  ESTABLE: 'Estable',
};

export const ETIQUETA_PRIORIDAD: Record<NivelPrioridad, string> = {
  URGENTE: 'Urgente',
  ATENCION: 'Atención',
  AL_DIA: 'Al día',
};

// ─── Coordinadores de PERF ───

export const COORDINADORES_PERF = ['Cami', 'Juli', 'Martu', 'Nay'] as const;

// ─── Urgencia y cálculo ───

export type Urgencia = 'urgente' | 'atencion' | 'aldia';

export function nivelAUrgencia(nivel: NivelPrioridad): Urgencia {
  switch (nivel) {
    case 'URGENTE':
      return 'urgente';
    case 'ATENCION':
      return 'atencion';
    case 'AL_DIA':
    default:
      return 'aldia';
  }
}

/**
 * Calcula el nivel de urgencia de un caso usando el modelo multicriterio de PERF.
 */
export function calcularUrgencia(caso: Partial<Caso>, umbralDias: number = 15): Urgencia {
  if (caso.estadoCaso === 'ADOPTADO' || caso.estadoCaso === 'FALLECIDO') {
    return 'aldia';
  }
  const gravedad = caso.gravedadClinica ?? 'MODERADA';
  const vuln = caso.vulnerabilidad ?? 'ESTABLE';
  const fecha = caso.fechaRescate ?? Date.now();
  const dias = Math.max(0, Math.floor((Date.now() - fecha) / (1000 * 60 * 60 * 24)));

  if (gravedad === 'CRITICA' || vuln === 'LACTANTE_SIN_MADRE' || vuln === 'SIN_TRANSITO' || dias > umbralDias) {
    return 'urgente';
  }
  if (gravedad === 'MODERADA' || vuln === 'EN_TRATAMIENTO' || dias >= Math.ceil(0.7 * umbralDias)) {
    return 'atencion';
  }
  return 'aldia';
}

/** Días transcurridos desde el rescate. */
export function diasEnEspera(caso: Pick<Caso, 'fechaRescate'>): number {
  return Math.max(0, Math.floor((Date.now() - caso.fechaRescate) / (1000 * 60 * 60 * 24)));
}

/** Descripción corta para tarjetas: "Gato · 45 días" */
export function descripcionCorta(caso: Pick<Caso, 'especie' | 'edadEstimada'>): string {
  return [ETIQUETA_ESPECIE[caso.especie], caso.edadEstimada].filter(Boolean).join(' · ');
}

// ─── Historial del caso ───

export type TipoEvento =
  | 'LLEGADA'
  | 'VISITA_VETERINARIA'
  | 'CAMBIO_TRANSITO'
  | 'DESPARASITACION'
  | 'CIRUGIA'
  | 'ADOPCION'
  | 'TRATAMIENTO'
  | 'NOTA_CAMPO'
  | 'VACUNACION';

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
  TRATAMIENTO: 'Tratamiento médico',
  NOTA_CAMPO: 'Evolución / Nota de campo',
  VACUNACION: 'Vacunación',
};
