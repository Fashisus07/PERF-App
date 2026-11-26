import type {
  Caso,
  EventoHistorial,
  Especie,
  EstadoCaso,
  EstadoCastracion,
  EstadoVirales,
  GravedadClinica,
  Vulnerabilidad,
  NivelPrioridad,
  TipoEvento,
} from '../../../domain/models/Caso';
import type { AnimalCaso } from '../../../domain/models/Animal';
import { CentroVeterinario, normalizarHorarios } from '../../../domain/models/Turno';
import type { Turno } from '../../../domain/models/Turno';
import { calcularPrioridadCasoUseCase } from '../../../domain/usecases/CalcularPrioridadCasoUseCase';

// Conversión entre el modelo local (camelCase, fechas en ms) y las filas del servidor (snake_case, fechas ISO).
// Sin dependencias de React Native: se puede probar con Node.

export type ValorCampo = string | number | null;
export type Comparable = Record<string, ValorCampo>;
export type FilaServidor = Record<string, any>;

const CAMPOS_FECHA = new Set(['fecha_primera_desparasitacion', 'fecha_segunda_desparasitacion']);

/** Campos del caso que se editan, con el nombre y la representación del servidor (fechas en ms). */
export function camposComparables(c: Caso): Comparable {
  return {
    nombre_provisorio: c.nombreProvisorio,
    cantidad_animales: c.cantidadAnimales,
    especie: c.especie,
    edad_estimada: c.edadEstimada || null,
    historia_origen: c.historiaOrigen || null,
    personalidad: c.personalidad || null,
    estado_visible: c.estadoVisible || null,
    barrio: c.barrio,
    latitud: c.coordenadas?.latitud ?? null,
    longitud: c.coordenadas?.longitud ?? null,
    quien_sigue_caso: c.quienSigueCaso || null,
    transito_nombre: c.transito.nombre || null,
    transito_telefono: c.transito.telefono || null,
    transito_correo: c.transito.correo || null,
    castrado: c.sanidad.castrado,
    virales_vif_vilef: c.sanidad.virales,
    fecha_primera_desparasitacion: c.sanidad.fechaPrimeraDesparasitacion ?? null,
    fecha_segunda_desparasitacion: c.sanidad.fechaSegundaDesparasitacion ?? null,
    estado_caso: c.estadoCaso,
    gravedad_clinica: c.gravedadClinica,
    vulnerabilidad: c.vulnerabilidad,
    nivel_prioridad: c.nivelPrioridad,
    motivo_urgencia: c.motivoUrgencia || null,
    puntaje_prioridad: c.puntajePrioridad,
    creado_por_user_id: c.creadoPorUserId || null,
    modificado_por_user_id: c.modificadoPorUserId || null,
    foto_remote_path: c.fotoRemotePath || null,
  };
}

export function valorParaServidor(campo: string, valor: ValorCampo): ValorCampo {
  return CAMPOS_FECHA.has(campo) && valor != null ? new Date(valor as number).toISOString() : valor;
}

export function filaCasoParaServidor(c: Caso): FilaServidor {
  const fila: FilaServidor = { id: c.id, fecha_rescate: new Date(c.fechaRescate).toISOString() };
  for (const [campo, valor] of Object.entries(camposComparables(c))) {
    fila[campo] = valorParaServidor(campo, valor);
  }
  return fila;
}

export interface Diferencias {
  /** Valores en la representación del servidor, listos para enviar. */
  cambios: Record<string, ValorCampo>;
  /** Momento (ms) en que se hizo cada cambio. */
  camposTs: Record<string, number>;
  /** Valores comparables de lo que se envía, para actualizar la base. */
  nuevosValores: Comparable;
}

/**
 * Qué campos cambió esta operación respecto de la última versión conocida del servidor.
 * Mandar solo estos evita pisar lo que otro voluntario modificó en campos que no tocamos.
 * El payload puede ser el caso completo o un cambio parcial.
 */
export function diferenciasCaso(payload: any, base: Comparable, creadoEn: number): Diferencias {
  let actual: Comparable;
  if (payload && 'nombreProvisorio' in payload) {
    actual = camposComparables(payload as Caso);
  } else {
    actual = {};
    if (payload?.estadoCaso) actual.estado_caso = payload.estadoCaso;
    if (payload?.transitoNombre) actual.transito_nombre = payload.transitoNombre;
    if (payload?.gravedadClinica) actual.gravedad_clinica = payload.gravedadClinica;
    if (payload?.vulnerabilidad) actual.vulnerabilidad = payload.vulnerabilidad;
    // Campos planos recibidos en delta
    for (const [k, v] of Object.entries(payload || {})) {
      if (k !== 'id' && k !== 'updatedAt' && k !== 'updated_at') {
        actual[k] = v as any;
      }
    }
  }

  const dif: Diferencias = { cambios: {}, camposTs: {}, nuevosValores: {} };
  for (const [campo, valor] of Object.entries(actual)) {
    if (base[campo] === valor) continue;
    dif.cambios[campo] = valorParaServidor(campo, valor);
    dif.camposTs[campo] = creadoEn;
    dif.nuevosValores[campo] = valor;
  }
  return dif;
}

const aMs = (iso: string | null | undefined): number | null => (iso ? Date.parse(iso) : null);

export function casoDesdeServidor(f: FilaServidor): Caso {
  const fechaRescate = Date.parse(f.fecha_rescate);
  const gravedadRaw = String(f.gravedad_clinica || f.gravedad || 'MODERADA').toUpperCase();
  const gravedad: GravedadClinica = ['CRITICA', 'MODERADA', 'LEVE', 'SANA'].includes(gravedadRaw)
    ? (gravedadRaw as GravedadClinica)
    : 'MODERADA';
  
  const vulnRaw = String(f.vulnerabilidad || 'ESTABLE').toUpperCase();
  const vulnerabilidad: Vulnerabilidad = ['LACTANTE_SIN_MADRE', 'SIN_TRANSITO', 'EN_TRATAMIENTO', 'ESTABLE'].includes(vulnRaw)
    ? (vulnRaw as Vulnerabilidad)
    : 'ESTABLE';

  const calculo = calcularPrioridadCasoUseCase.ejecutar({
    estadoCaso: f.estado_caso,
    gravedadClinica: gravedad,
    vulnerabilidad,
    fechaRescate,
  });

  return {
    id: f.id,
    nombreProvisorio: f.nombre_provisorio,
    cantidadAnimales: f.cantidad_animales,
    especie: f.especie as Especie,
    edadEstimada: f.edad_estimada ?? '',
    historiaOrigen: f.historia_origen ?? '',
    personalidad: f.personalidad ?? '',
    estadoVisible: f.estado_visible ?? '',
    barrio: f.barrio,
    coordenadas: f.latitud != null && f.longitud != null ? { latitud: f.latitud, longitud: f.longitud } : null,
    fotoUri: null, // las fotos se manejan aparte; al guardar se conserva la local
    fotoLocalUri: null,
    fotoRemotePath: f.foto_remote_path ?? null,
    fotoSyncStatus: f.foto_remote_path ? 'SYNCED' : 'PENDING',
    fechaRescate,
    quienSigueCaso: f.quien_sigue_caso ?? '',
    transito: {
      nombre: f.transito_nombre ?? '',
      telefono: f.transito_telefono ?? '',
      correo: f.transito_correo ?? undefined,
    },
    sanidad: {
      castrado: f.castrado as EstadoCastracion,
      virales: f.virales_vif_vilef as EstadoVirales,
      fechaPrimeraDesparasitacion: aMs(f.fecha_primera_desparasitacion),
      fechaSegundaDesparasitacion: aMs(f.fecha_segunda_desparasitacion),
    },
    estadoCaso: f.estado_caso as EstadoCaso,
    gravedadClinica: gravedad,
    vulnerabilidad,
    nivelPrioridad: (f.nivel_prioridad as NivelPrioridad) || calculo.nivelPrioridad,
    motivoUrgencia: f.motivo_urgencia || calculo.motivoUrgencia,
    puntajePrioridad: f.puntaje_prioridad ?? calculo.puntajePrioridad,
    creadoPorUserId: f.creado_por ?? f.creado_por_user_id ?? undefined,
    modificadoPorUserId: f.modificado_por_user_id ?? undefined,
    esUrgente: calculo.esUrgente,
    syncStatus: 'SYNCED',
    updatedAt: Date.parse(f.updated_at),
  };
}

export function filaEventoParaServidor(e: EventoHistorial): FilaServidor {
  return {
    id: e.id,
    caso_id: e.casoId,
    tipo: e.tipo,
    fecha: new Date(e.fecha).toISOString(),
    descripcion: e.descripcion,
  };
}

export function eventoDesdeServidor(f: FilaServidor): EventoHistorial {
  return {
    id: f.id,
    casoId: f.caso_id,
    tipo: f.tipo as TipoEvento,
    fecha: Date.parse(f.fecha),
    descripcion: f.descripcion,
    syncStatus: 'SYNCED',
  };
}

export function filaTurnoParaServidor(t: Turno, clinicaExiste: boolean = true): FilaServidor {
  return {
    id: t.id,
    caso_id: t.casoId,
    centro_veterinario_id: clinicaExiste && t.centroVeterinarioId ? t.centroVeterinarioId : null,
    fecha_hora: new Date(t.fechaHora).toISOString(),
    motivo: t.motivo,
    recordatorio_minutos: t.recordatorioMinutos,
    cumplido: t.cumplido,
  };
}

export function turnoDesdeServidor(f: FilaServidor): Turno {
  return {
    id: f.id,
    casoId: f.caso_id,
    centroVeterinarioId: f.centro_veterinario_id || undefined,
    fechaHora: Date.parse(f.fecha_hora),
    motivo: f.motivo,
    recordatorioMinutos: f.recordatorio_minutos,
    cumplido: Boolean(f.cumplido),
    syncStatus: 'SYNCED',
    updatedAt: Date.parse(f.updated_at),
  };
}

const iso = (ms: number | null | undefined) => (ms != null ? new Date(ms).toISOString() : null);

/** Fila de `animales` para el servidor. `creado_por` lo pone la base (auth.uid()) y no se envia. */
export function filaAnimalParaServidor(a: AnimalCaso): FilaServidor {
  return {
    id: a.id,
    caso_id: a.casoId,
    nombre: a.nombre,
    castrado: a.castrado,
    virales_vif_vilef: a.virales,
    embarazada: a.embarazada,
    peso_gramos: a.pesoGramos ?? null,
    fecha_primera_desparasitacion: iso(a.fechaPrimeraDesparasitacion),
    fecha_segunda_desparasitacion: iso(a.fechaSegundaDesparasitacion),
    fallecido: a.fallecido,
    motivo_fallecimiento: a.motivoFallecimiento ?? null,
  };
}

export function animalDesdeServidor(f: FilaServidor): AnimalCaso {
  return {
    id: f.id,
    casoId: f.caso_id,
    nombre: f.nombre,
    castrado: f.castrado as EstadoCastracion,
    virales: f.virales_vif_vilef as EstadoVirales,
    embarazada: Boolean(f.embarazada),
    pesoGramos: f.peso_gramos ?? null,
    fechaPrimeraDesparasitacion: aMs(f.fecha_primera_desparasitacion),
    fechaSegundaDesparasitacion: aMs(f.fecha_segunda_desparasitacion),
    fallecido: Boolean(f.fallecido),
    motivoFallecimiento: f.motivo_fallecimiento ?? null,
    syncStatus: 'SYNCED',
    updatedAt: Date.parse(f.updated_at),
  };
}

/** Fila de `centros_veterinarios` para el servidor. */
export function filaCentroParaServidor(c: CentroVeterinario): FilaServidor {
  return {
    id: c.id,
    nombre: c.nombre.trim(),
    medico: c.medico?.trim() || null,
    barrio: c.barrio.trim(),
    direccion: c.direccion.trim(),
    telefono: c.telefono.trim(),
    detalle: c.detalle?.trim() || null,
    distancia: c.distancia?.trim() || null,
    abierto: c.abierto,
    tipo: c.tipo,
    horarios: normalizarHorarios(c.horarios),
  };
}

export function centroDesdeServidor(f: FilaServidor): CentroVeterinario {
  return {
    id: f.id,
    nombre: f.nombre,
    medico: f.medico || undefined,
    barrio: f.barrio,
    direccion: f.direccion,
    telefono: f.telefono,
    detalle: f.detalle || undefined,
    distancia: f.distancia || undefined,
    abierto: f.abierto !== false,
    tipo: f.tipo,
    horarios: normalizarHorarios(f.horarios),
  };
}
