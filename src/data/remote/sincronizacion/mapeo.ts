import type { Caso, EventoHistorial, Especie, EstadoCaso, EstadoCastracion, EstadoVirales, TipoEvento } from '../../../domain/models/Caso';
import type { Turno } from '../../../domain/models/Turno';

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
    // El servidor tiene tres niveles de gravedad; la app todavía un booleano.
    gravedad: c.esUrgente ? 'urgente' : 'estable',
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
 * El payload puede ser el caso completo o un cambio parcial ({ id, estadoCaso }).
 */
export function diferenciasCaso(payload: any, base: Comparable, creadoEn: number): Diferencias {
  let actual: Comparable;
  if (payload && 'nombreProvisorio' in payload) {
    actual = camposComparables(payload as Caso);
  } else {
    actual = {};
    if (payload?.estadoCaso) actual.estado_caso = payload.estadoCaso;
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
    fechaRescate: Date.parse(f.fecha_rescate),
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
    esUrgente: f.gravedad !== 'estable',
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

/** `centroConocido`: solo se envía el centro si existe en el servidor (la clave foránea lo exige). */
export function filaTurnoParaServidor(t: Turno, centroConocido: boolean): FilaServidor {
  return {
    id: t.id,
    caso_id: t.casoId,
    centro_veterinario_id: centroConocido ? (t.centroVeterinarioId ?? null) : null,
    fecha_hora: new Date(t.fechaHora).toISOString(),
    motivo: t.motivo,
    recordatorio_minutos: t.recordatorioMinutos,
    cumplido: t.cumplido,
  };
}

export function turnoDesdeServidor(f: FilaServidor, centroLocal?: string): Turno {
  return {
    id: f.id,
    casoId: f.caso_id,
    centroVeterinarioId: f.centro_veterinario_id ?? centroLocal ?? undefined,
    fechaHora: Date.parse(f.fecha_hora),
    motivo: f.motivo,
    recordatorioMinutos: f.recordatorio_minutos,
    cumplido: f.cumplido,
    syncStatus: 'SYNCED',
    updatedAt: Date.parse(f.updated_at),
  };
}
