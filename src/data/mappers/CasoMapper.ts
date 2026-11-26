import type { AnimalCaso } from '../../domain/models/Animal';
import {
  Caso,
  EventoHistorial,
  SyncStatus,
  Especie,
  EstadoCaso,
  EstadoCastracion,
  EstadoVirales,
  GravedadClinica,
  Vulnerabilidad,
  NivelPrioridad,
  TipoEvento,
} from '../../domain/models/Caso';
import { Turno } from '../../domain/models/Turno';
import {
  OperacionPendiente,
  EntidadPendiente,
  TipoOperacion,
} from '../../domain/models/OperacionPendiente';
import { calcularPrioridadCasoUseCase } from '../../domain/usecases/CalcularPrioridadCasoUseCase';

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
  foto_local_uri?: string | null;
  foto_remote_path?: string | null;
  foto_sync_status?: string | null;
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
  gravedad_clinica?: string | null;
  vulnerabilidad?: string | null;
  nivel_prioridad?: string | null;
  motivo_urgencia?: string | null;
  puntaje_prioridad?: number | null;
  creado_por_user_id?: string | null;
  modificado_por_user_id?: string | null;
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
  notification_id?: string | null;
  sync_status: string;
  updated_at: number;
}

export interface AnimalRow {
  id: string;
  caso_id: string;
  nombre: string;
  castrado: string;
  virales_vif_vilef: string;
  embarazada: number;
  peso_gramos: number | null;
  fecha_primera_desparasitacion: number | null;
  fecha_segunda_desparasitacion: number | null;
  fallecido: number;
  motivo_fallecimiento: string | null;
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
  idempotency_key?: string | null;
  entidad: string;
  operacion: string;
  payload: string;
  reintentos: number;
  created_at: number;
}

// ─── Mappers: Row → Domain ───

export function casoFromRow(row: CasoRow): Caso {
  const gravedad = (row.gravedad_clinica as GravedadClinica) || (row.es_urgente === 1 ? 'CRITICA' : 'MODERADA');
  const vulnerabilidad = (row.vulnerabilidad as Vulnerabilidad) || 'ESTABLE';
  
  // Si no tenía cálculo persistido, lo evaluamos en vuelo
  const calculo = calcularPrioridadCasoUseCase.ejecutar({
    estadoCaso: row.estado_caso,
    gravedadClinica: gravedad,
    vulnerabilidad,
    fechaRescate: row.fecha_rescate,
  });

  const nivelPrioridad = (row.nivel_prioridad as NivelPrioridad) || calculo.nivelPrioridad;
  const motivoUrgencia = row.motivo_urgencia || calculo.motivoUrgencia;
  const puntajePrioridad = row.puntaje_prioridad ?? calculo.puntajePrioridad;

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
    coordenadas:
      row.latitud != null && row.longitud != null
        ? { latitud: row.latitud, longitud: row.longitud }
        : null,
    fotoUri: row.foto_uri,
    fotoLocalUri: row.foto_local_uri ?? row.foto_uri,
    fotoRemotePath: row.foto_remote_path ?? null,
    fotoSyncStatus: (row.foto_sync_status as any) || (row.foto_uri ? 'PENDING' : 'SYNCED'),
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
    gravedadClinica: gravedad,
    vulnerabilidad,
    nivelPrioridad,
    motivoUrgencia,
    puntajePrioridad,
    creadoPorUserId: row.creado_por_user_id ?? undefined,
    modificadoPorUserId: row.modificado_por_user_id ?? undefined,
    esUrgente: nivelPrioridad === 'URGENTE',
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
    notificationId: row.notification_id ?? null,
    syncStatus: row.sync_status as SyncStatus,
    updatedAt: row.updated_at,
  };
}

export function animalFromRow(row: AnimalRow): AnimalCaso {
  return {
    id: row.id,
    casoId: row.caso_id,
    nombre: row.nombre,
    castrado: row.castrado as EstadoCastracion,
    virales: row.virales_vif_vilef as EstadoVirales,
    embarazada: row.embarazada === 1,
    pesoGramos: row.peso_gramos,
    fechaPrimeraDesparasitacion: row.fecha_primera_desparasitacion,
    fechaSegundaDesparasitacion: row.fecha_segunda_desparasitacion,
    fallecido: row.fallecido === 1,
    motivoFallecimiento: row.motivo_fallecimiento,
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
    idempotencyKey: row.idempotency_key ?? undefined,
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
  const gravedad = caso.gravedadClinica || (caso.esUrgente ? 'CRITICA' : 'MODERADA');
  const vulnerabilidad = caso.vulnerabilidad || 'ESTABLE';
  const calculo = calcularPrioridadCasoUseCase.ejecutar({
    estadoCaso: caso.estadoCaso,
    gravedadClinica: gravedad,
    vulnerabilidad,
    fechaRescate: caso.fechaRescate,
  });

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
    $foto_local_uri: caso.fotoLocalUri ?? caso.fotoUri ?? null,
    $foto_remote_path: caso.fotoRemotePath ?? null,
    $foto_sync_status: caso.fotoSyncStatus ?? (caso.fotoUri ? 'PENDING' : 'SYNCED'),
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
    $gravedad_clinica: gravedad,
    $vulnerabilidad: vulnerabilidad,
    $nivel_prioridad: caso.nivelPrioridad || calculo.nivelPrioridad,
    $motivo_urgencia: caso.motivoUrgencia || calculo.motivoUrgencia,
    $puntaje_prioridad: caso.puntajePrioridad ?? calculo.puntajePrioridad,
    $creado_por_user_id: caso.creadoPorUserId ?? null,
    $modificado_por_user_id: caso.modificadoPorUserId ?? null,
    $es_urgente: (caso.nivelPrioridad === 'URGENTE' || calculo.esUrgente) ? 1 : 0,
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
    $notification_id: turno.notificationId ?? null,
    $sync_status: turno.syncStatus,
    $updated_at: turno.updatedAt,
  };
}

export function animalToParams(a: AnimalCaso): SQLiteBindParams {
  return {
    $id: a.id,
    $caso_id: a.casoId,
    $nombre: a.nombre,
    $castrado: a.castrado,
    $virales_vif_vilef: a.virales,
    $embarazada: a.embarazada ? 1 : 0,
    $peso_gramos: a.pesoGramos ?? null,
    $fecha_primera_desparasitacion: a.fechaPrimeraDesparasitacion ?? null,
    $fecha_segunda_desparasitacion: a.fechaSegundaDesparasitacion ?? null,
    $fallecido: a.fallecido ? 1 : 0,
    $motivo_fallecimiento: a.motivoFallecimiento ?? null,
    $sync_status: a.syncStatus,
    $updated_at: a.updatedAt,
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
