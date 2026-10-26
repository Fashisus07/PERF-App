import { Caso, EventoHistorial, SyncStatus, Especie, EstadoCaso, EstadoCastracion, EstadoVirales, TipoEvento } from '../../domain/models/Caso';
import { Turno } from '../../domain/models/Turno';
import { OperacionPendiente, EntidadPendiente, TipoOperacion } from '../../domain/models/OperacionPendiente';

// ─── Tipos de las filas SQLite (todo primitivo) ───

export interface CasoRow {
  id: string;
  nombre_provisorio: string;
  cantidad_animales: number;
  especie: string;
  edad_estimada: string | null;
  historia_origen: string | null;
  personalidad: string | null;
  estado_visible: string | null;
  barrio: string;
  latitud: number | null;
  longitud: number | null;
  foto_uri: string | null;
  fecha_rescate: number;
  quien_sigue_caso: string | null;
  transito_nombre: string | null;
  transito_telefono: string | null;
  transito_correo: string | null;
  castrado: string;
  virales_vif_vilef: string;
  fecha_primera_desparasitacion: number | null;
  fecha_segunda_desparasitacion: number | null;
  estado_caso: string;
  es_urgente: number;
  sync_status: string;
  updated_at: number;
}

export interface TurnoRow {
  id: string;
  caso_id: string;
  centro_veterinario_id: string | null;
  fecha_hora: number;
  motivo: string;
  recordatorio_minutos: number;
  cumplido: number;
  sync_status: string;
  updated_at: number;
}

export interface EventoHistorialRow {
  id: string;
  caso_id: string;
  tipo: string;
  fecha: number;
  descripcion: string;
  sync_status: string;
}

export interface OperacionPendienteRow {
  id: number;
  entidad: string;
  operacion: string;
  payload: string;
  reintentos: number;
  created_at: number;
}

// ─── Mappers: Row → Domain ───

export function casoFromRow(row: CasoRow): Caso {
  return {
    id: row.id,
    nombreProvisorio: row.nombre_provisorio,
    cantidadAnimales: row.cantidad_animales,
    especie: row.especie as Especie,
    edadEstimada: row.edad_estimada ?? '',
    historiaOrigen: row.historia_origen ?? '',
    personalidad: row.personalidad ?? '',
    estadoVisible: row.estado_visible ?? '',
    barrio: row.barrio,
    coordenadas: row.latitud != null && row.longitud != null
      ? { latitud: row.latitud, longitud: row.longitud }
      : null,
    fotoUri: row.foto_uri,
    fechaRescate: row.fecha_rescate,
    quienSigueCaso: row.quien_sigue_caso ?? '',
    transito: {
      nombre: row.transito_nombre ?? '',
      telefono: row.transito_telefono ?? '',
      correo: row.transito_correo ?? undefined,
    },
    sanidad: {
      castrado: row.castrado as EstadoCastracion,
      virales: row.virales_vif_vilef as EstadoVirales,
      fechaPrimeraDesparasitacion: row.fecha_primera_desparasitacion,
      fechaSegundaDesparasitacion: row.fecha_segunda_desparasitacion,
    },
    estadoCaso: row.estado_caso as EstadoCaso,
    esUrgente: row.es_urgente === 1,
    syncStatus: row.sync_status as SyncStatus,
    updatedAt: row.updated_at,
  };
}

export function turnoFromRow(row: TurnoRow): Turno {
  return {
    id: row.id,
    casoId: row.caso_id,
    centroVeterinarioId: row.centro_veterinario_id ?? undefined,
    fechaHora: row.fecha_hora,
    motivo: row.motivo,
    recordatorioMinutos: row.recordatorio_minutos,
    cumplido: row.cumplido === 1,
    syncStatus: row.sync_status as SyncStatus,
    updatedAt: row.updated_at,
  };
}

export function eventoFromRow(row: EventoHistorialRow): EventoHistorial {
  return {
    id: row.id,
    casoId: row.caso_id,
    tipo: row.tipo as TipoEvento,
    fecha: row.fecha,
    descripcion: row.descripcion,
    syncStatus: row.sync_status as SyncStatus,
  };
}

export function operacionFromRow(row: OperacionPendienteRow): OperacionPendiente {
  return {
    id: row.id,
    entidad: row.entidad as EntidadPendiente,
    operacion: row.operacion as TipoOperacion,
    payload: row.payload,
    reintentos: row.reintentos,
    createdAt: row.created_at,
  };
}

export type SQLiteBindValue = string | number | null | boolean | Uint8Array | ArrayBuffer;
export type SQLiteBindParams = Record<string, SQLiteBindValue>;

// ─── Mappers: Domain → Row params (para INSERT/UPDATE) ───

export function casoToParams(caso: Caso): SQLiteBindParams {
  return {
    $id: caso.id,
    $nombre_provisorio: caso.nombreProvisorio,
    $cantidad_animales: caso.cantidadAnimales,
    $especie: caso.especie,
    $edad_estimada: caso.edadEstimada || null,
    $historia_origen: caso.historiaOrigen || null,
    $personalidad: caso.personalidad || null,
    $estado_visible: caso.estadoVisible || null,
    $barrio: caso.barrio,
    $latitud: caso.coordenadas?.latitud ?? null,
    $longitud: caso.coordenadas?.longitud ?? null,
    $foto_uri: caso.fotoUri ?? null,
    $fecha_rescate: caso.fechaRescate,
    $quien_sigue_caso: caso.quienSigueCaso || null,
    $transito_nombre: caso.transito.nombre || null,
    $transito_telefono: caso.transito.telefono || null,
    $transito_correo: caso.transito.correo ?? null,
    $castrado: caso.sanidad.castrado,
    $virales_vif_vilef: caso.sanidad.virales,
    $fecha_primera_desparasitacion: caso.sanidad.fechaPrimeraDesparasitacion ?? null,
    $fecha_segunda_desparasitacion: caso.sanidad.fechaSegundaDesparasitacion ?? null,
    $estado_caso: caso.estadoCaso,
    $es_urgente: caso.esUrgente ? 1 : 0,
    $sync_status: caso.syncStatus,
    $updated_at: caso.updatedAt,
  };
}

export function turnoToParams(turno: Turno): SQLiteBindParams {
  return {
    $id: turno.id,
    $caso_id: turno.casoId,
    $centro_veterinario_id: turno.centroVeterinarioId ?? null,
    $fecha_hora: turno.fechaHora,
    $motivo: turno.motivo,
    $recordatorio_minutos: turno.recordatorioMinutos,
    $cumplido: turno.cumplido ? 1 : 0,
    $sync_status: turno.syncStatus,
    $updated_at: turno.updatedAt,
  };
}

export function eventoToParams(evento: EventoHistorial): SQLiteBindParams {
  return {
    $id: evento.id,
    $caso_id: evento.casoId,
    $tipo: evento.tipo,
    $fecha: evento.fecha,
    $descripcion: evento.descripcion,
    $sync_status: evento.syncStatus,
  };
}
