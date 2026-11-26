import {
  calcularPrioridadCasoUseCase,
  ResultadoCalculoPrioridad,
} from '../usecases/CalcularPrioridadCasoUseCase';

// ─── Tipos enumerados alineados con la planilla operativa PERF ───

export type Especie = 'Gato' | 'Perro' | 'Otro';

export const ESPECIES_OTRO_SUGERIDAS = [
  'Conejo',
  'Cobayo',
  'Ave / Pájaro',
  'Tortuga',
  'Hámster',
  'Hurón',
  'Erizo',
] as const;

export type ResultadoTestViral = 'PENDIENTE' | 'NEGATIVO' | 'POSITIVO' | 'NO_APLICA';

export const ETIQUETA_RESULTADO_TEST: Record<ResultadoTestViral, string> = {
  PENDIENTE: 'Pendiente',
  NEGATIVO: 'Negativo',
  POSITIVO: 'Positivo',
  NO_APLICA: 'No aplica',
};

export interface Coordinador {
  id: string;
  nombre: string;
  perfilId?: string | null;
  activo: boolean;
}

export const COORDINADORES_FIJOS: Coordinador[] = [
  { id: 'coord-cami', nombre: 'Cami', perfilId: null, activo: true },
  { id: 'coord-juli', nombre: 'Juli', perfilId: null, activo: true },
  { id: 'coord-martu', nombre: 'Martu', perfilId: null, activo: true },
  { id: 'coord-nay', nombre: 'Nay', perfilId: null, activo: true },
];

export interface TestViralFijo {
  id: string;
  nombre: string;
  especie: Especie;
  orden: number;
  activo: boolean;
}

export const TESTS_VIRALES_FIJOS: TestViralFijo[] = [
  { id: 'vif', nombre: 'VIF (Inmunodeficiencia felina)', especie: 'Gato', orden: 1, activo: true },
  { id: 'vilef', nombre: 'ViLeF (Leucemia felina)', especie: 'Gato', orden: 2, activo: true },
  { id: 'parvo', nombre: 'Parvovirus canino', especie: 'Perro', orden: 1, activo: true },
  { id: 'moquillo', nombre: 'Moquillo / Distemper', especie: 'Perro', orden: 2, activo: true },
  { id: 'control_clinico', nombre: 'Control clínico / estudios generales', especie: 'Otro', orden: 1, activo: true },
];

export function testsPorEspecie(especie: Especie, catalogo: TestViralFijo[] = TESTS_VIRALES_FIJOS): TestViralFijo[] {
  return catalogo
    .filter((t) => t.activo && t.especie === especie)
    .sort((a, b) => a.orden - b.orden);
}

export interface RegistroTestAnimal {
  id: string;
  casoId: string;
  animalId?: string | null;
  testId: string;
  resultado: ResultadoTestViral;
  fechaTest?: number | null;
  observaciones?: string | null;
  registradoPor?: string | null;
  updatedAt: number;
}

export type TipoRelacionAnimal =
  | 'HIJO_DE'
  | 'HIJA_DE'
  | 'HERMANO_DE'
  | 'HERMANA_DE'
  | 'MAMA_DE'
  | 'PAPA_DE'
  | 'CAMADA_DE'
  | 'OTRA';

export const TIPOS_RELACION_LISTA: TipoRelacionAnimal[] = [
  'HIJO_DE',
  'HIJA_DE',
  'HERMANO_DE',
  'HERMANA_DE',
  'MAMA_DE',
  'PAPA_DE',
  'CAMADA_DE',
];

export const ETIQUETA_RELACION: Record<TipoRelacionAnimal, string> = {
  HIJO_DE: 'Hijo de',
  HIJA_DE: 'Hija de',
  HERMANO_DE: 'Hermano de',
  HERMANA_DE: 'Hermana de',
  MAMA_DE: 'Mamá de',
  PAPA_DE: 'Papá de',
  CAMADA_DE: 'Camada de',
  OTRA: 'Vinculado con',
};

export interface RelacionAnimal {
  id: string;
  casoOrigenId: string;
  tipoRelacion: TipoRelacionAnimal;
  casoDestinoId?: string | null;
  nombreDestino: string;
  updatedAt: number;
}

export interface RelacionVisible {
  relacionId: string;
  texto: string;
  targetCasoId?: string | null;
  targetNombre: string;
  esSaliente: boolean;
}

/**
 * Devuelve cómo debe leerse un vínculo familiar desde la ficha de `casoActualId`.
 * Ejemplo: si Toto cargó `HIJO_DE` -> Mora, en Toto se lee "Hijo de Mora" y en Mora se lee "Cría / Hijo(a): Toto".
 */
export function etiquetaRelacionParaCaso(
  relacion: RelacionAnimal,
  casoActualId: string,
  nombresPorId?: Record<string, string> | Map<string, string>
): RelacionVisible {
  const resolverNombre = (id?: string | null, respaldo?: string) => {
    if (!id) return (respaldo ?? '').trim() || 'Otro animal';
    if (nombresPorId instanceof Map) return nombresPorId.get(id) ?? (respaldo || 'Animal');
    if (nombresPorId && nombresPorId[id]) return nombresPorId[id];
    return (respaldo ?? '').trim() || 'Animal';
  };

  if (relacion.casoOrigenId === casoActualId) {
    const targetNombre = resolverNombre(relacion.casoDestinoId, relacion.nombreDestino);
    return {
      relacionId: relacion.id,
      texto: `${ETIQUETA_RELACION[relacion.tipoRelacion]} ${targetNombre}`,
      targetCasoId: relacion.casoDestinoId ?? null,
      targetNombre,
      esSaliente: true,
    };
  }

  const origenNombre = resolverNombre(relacion.casoOrigenId);
  let prefijo = 'Vinculado:';
  switch (relacion.tipoRelacion) {
    case 'HIJO_DE':
    case 'HIJA_DE':
      prefijo = 'Cría / Hijo(a):';
      break;
    case 'HERMANO_DE':
    case 'HERMANA_DE':
      prefijo = 'Hermano/a:';
      break;
    case 'MAMA_DE':
      prefijo = 'Mamá:';
      break;
    case 'PAPA_DE':
      prefijo = 'Papá:';
      break;
    case 'CAMADA_DE':
      prefijo = 'Camada:';
      break;
  }

  return {
    relacionId: relacion.id,
    texto: `${prefijo} ${origenNombre}`,
    targetCasoId: relacion.casoOrigenId,
    targetNombre: origenNombre,
    esSaliente: false,
  };
}

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
  especieDetalle?: string | null;
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
  /** Última visita, nota o tratamiento del historial. Se deriva de los eventos: no se guarda aparte. */
  fechaUltimaRevision?: number | null;
  quienSigueCaso: string;
  coordinadorId?: string | null;
  coordinadorPerfilId?: string | null;
  transito: HogarTransito;
  sanidad: FichaSanitariaFelina;
  testsAnimal?: RegistroTestAnimal[];
  relaciones?: RelacionAnimal[];
  estadoCaso: EstadoCaso;
  gravedadClinica: GravedadClinica;
  vulnerabilidad: Vulnerabilidad;
  nivelPrioridad: NivelPrioridad;
  motivoUrgencia: string;
  puntajePrioridad: number;
  creadoPorUserId?: string;
  creadoPorNombre?: string | null;
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

/** Días de espera a partir de los cuales un caso pasa a urgente (se puede cambiar en Ajustes). */
export const UMBRAL_URGENTE_DIAS = 15;

export type PrioridadCaso = ResultadoCalculoPrioridad & { urgencia: Urgencia };

/**
 * Prioridad de un caso hoy: nivel, motivo, puntaje y factores médicos. Es la ÚNICA fuente
 * de las reglas (`CalcularPrioridadCasoUseCase`) y se calcula al mostrar, no se lee de lo guardado:
 * con el paso de los días o al editar la ficha sanitaria, el nivel refleja la situación real.
 */
export function prioridadDeCaso(caso: Partial<Caso>, umbralDias: number = UMBRAL_URGENTE_DIAS): PrioridadCaso {
  const calculo = calcularPrioridadCasoUseCase.ejecutar(
    {
      especie: caso.especie,
      estadoCaso: caso.estadoCaso ?? 'EN_TRANSITO',
      gravedadClinica: caso.gravedadClinica,
      vulnerabilidad: caso.vulnerabilidad,
      fechaRescate: caso.fechaRescate ?? Date.now(),
      fechaUltimaRevision: caso.fechaUltimaRevision,
      sanidad: caso.sanidad,
      testsAnimal: caso.testsAnimal,
    },
    umbralDias
  );
  return { ...calculo, urgencia: nivelAUrgencia(calculo.nivelPrioridad) };
}

/** Solo el nivel de urgencia. Usa `prioridadDeCaso`: no hay otra regla. */
export function calcularUrgencia(caso: Partial<Caso>, umbralDias: number = UMBRAL_URGENTE_DIAS): Urgencia {
  return prioridadDeCaso(caso, umbralDias).urgencia;
}

/** Días transcurridos desde el rescate. */
export function diasEnEspera(caso: Pick<Caso, 'fechaRescate'>): number {
  return Math.max(0, Math.floor((Date.now() - caso.fechaRescate) / (1000 * 60 * 60 * 24)));
}

/** Nombre visible de especie ("Conejo" si eligió "Otro" con detalle, si no "Gato" / "Perro" / "Otro"). */
export function especieLegible(caso: Pick<Caso, 'especie' | 'especieDetalle'>): string {
  if (caso.especie === 'Otro' && caso.especieDetalle?.trim()) {
    return caso.especieDetalle.trim();
  }
  return ETIQUETA_ESPECIE[caso.especie];
}

/** Descripción corta para tarjetas: "Gato · 45 días" o "Conejo · 6 meses" */
export function descripcionCorta(caso: Pick<Caso, 'especie' | 'especieDetalle' | 'edadEstimada'>): string {
  return [especieLegible(caso), caso.edadEstimada].filter(Boolean).join(' · ');
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

/** Eventos que NO cuentan como revisar al animal: son movimientos administrativos. */
export const EVENTOS_QUE_NO_SON_REVISION: TipoEvento[] = ['CAMBIO_TRANSITO', 'ADOPCION'];

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
