import * as Notifications from 'expo-notifications';
import { ResumenAlmacenamiento } from '../../domain/models/Ajustes';
import { Caso, EstadoCaso, EventoHistorial } from '../../domain/models/Caso';
import { CasoRepository, OperacionPendiente } from '../../domain/repositories/CasoRepository';
import { getDatabase } from '../local/Database';
import { generarUUID } from '../local/uuid';
import {
  casoFromRow,
  casoToParams,
  eventoFromRow,
  eventoToParams,
  CasoRow,
  EventoHistorialRow,
} from '../mappers/CasoMapper';
import { casosMock } from '../mock/casosMock';
import { sincronizarConSupabase } from '../remote/sincronizacion/SincronizadorSupabase';

export class CasoRepositoryImpl implements CasoRepository {
  private seeded = false;
  private siembra: Promise<void> | null = null;

  // Varias pantallas la llaman a la vez: compartimos una sola siembra para no insertar dos veces.
  private asegurarSemilla(): Promise<void> {
    if (this.seeded) return Promise.resolve();
    this.siembra ??= this.sembrar().catch((e) => {
      this.siembra = null; // permitir reintentar si falló
      throw e;
    });
    return this.siembra;
  }

  private async sembrar(): Promise<void> {
    const db = await getDatabase();
    const countResult = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM casos;'
    );
    if (!countResult || countResult.count === 0) {
      // Poblar con casos iniciales de PERF
      for (const caso of casosMock) {
        const params = casoToParams(caso);
        await db.runAsync(
          `INSERT INTO casos (
            id, nombre_provisorio, cantidad_animales, especie, edad_estimada,
            historia_origen, personalidad, estado_visible, barrio, latitud,
            longitud, foto_uri, foto_local_uri, foto_remote_path, foto_sync_status,
            fecha_rescate, quien_sigue_caso, transito_nombre,
            transito_telefono, transito_correo, castrado, virales_vif_vilef,
            fecha_primera_desparasitacion, fecha_segunda_desparasitacion,
            estado_caso, gravedad_clinica, vulnerabilidad, nivel_prioridad,
            motivo_urgencia, puntaje_prioridad, creado_por_user_id, modificado_por_user_id,
            es_urgente, sync_status, updated_at
          ) VALUES (
            $id, $nombre_provisorio, $cantidad_animales, $especie, $edad_estimada,
            $historia_origen, $personalidad, $estado_visible, $barrio, $latitud,
            $longitud, $foto_uri, $foto_local_uri, $foto_remote_path, $foto_sync_status,
            $fecha_rescate, $quien_sigue_caso, $transito_nombre,
            $transito_telefono, $transito_correo, $castrado, $virales_vif_vilef,
            $fecha_primera_desparasitacion, $fecha_segunda_desparasitacion,
            $estado_caso, $gravedad_clinica, $vulnerabilidad, $nivel_prioridad,
            $motivo_urgencia, $puntaje_prioridad, $creado_por_user_id, $modificado_por_user_id,
            $es_urgente, $sync_status, $updated_at
          );`,
          params
        );

        // Evento de llegada inicial
        const eventoLlegada: EventoHistorial = {
          id: generarUUID(),
          casoId: caso.id,
          tipo: 'LLEGADA',
          fecha: caso.fechaRescate,
          descripcion: `Rescate registrado en ${caso.barrio}. Coordinado por ${caso.quienSigueCaso || 'PERF'}.`,
          syncStatus: 'SYNCED',
        };
        await db.runAsync(
          `INSERT INTO eventos_historial (id, caso_id, tipo, fecha, descripcion, sync_status)
           VALUES ($id, $caso_id, $tipo, $fecha, $descripcion, $sync_status);`,
          eventoToParams(eventoLlegada)
        );
      }
    }
    this.seeded = true;
  }

  async obtenerActivos(): Promise<Caso[]> {
    await this.asegurarSemilla();
    const db = await getDatabase();
    const rows = await db.getAllAsync<CasoRow>(
      `SELECT * FROM casos WHERE estado_caso NOT IN ('ADOPTADO', 'FALLECIDO') ORDER BY puntaje_prioridad DESC, fecha_rescate DESC;`
    );
    return rows.map(casoFromRow);
  }

  async obtenerArchivados(): Promise<Caso[]> {
    await this.asegurarSemilla();
    const db = await getDatabase();
    const rows = await db.getAllAsync<CasoRow>(
      `SELECT * FROM casos WHERE estado_caso IN ('ADOPTADO', 'FALLECIDO') ORDER BY updated_at DESC;`
    );
    return rows.map(casoFromRow);
  }

  async obtenerTodos(): Promise<Caso[]> {
    await this.asegurarSemilla();
    const db = await getDatabase();
    const rows = await db.getAllAsync<CasoRow>(
      `SELECT * FROM casos ORDER BY fecha_rescate DESC;`
    );
    return rows.map(casoFromRow);
  }

  async obtenerPorId(id: string): Promise<Caso | undefined> {
    await this.asegurarSemilla();
    const db = await getDatabase();
    const row = await db.getFirstAsync<CasoRow>(
      `SELECT * FROM casos WHERE id = ?;`,
      [id]
    );
    return row ? casoFromRow(row) : undefined;
  }

  async agregar(caso: Caso): Promise<Caso> {
    const db = await getDatabase();
    const params = casoToParams(caso);

    await db.runAsync(
      `INSERT INTO casos (
        id, nombre_provisorio, cantidad_animales, especie, edad_estimada,
        historia_origen, personalidad, estado_visible, barrio, latitud,
        longitud, foto_uri, foto_local_uri, foto_remote_path, foto_sync_status,
        fecha_rescate, quien_sigue_caso, transito_nombre,
        transito_telefono, transito_correo, castrado, virales_vif_vilef,
        fecha_primera_desparasitacion, fecha_segunda_desparasitacion,
        estado_caso, gravedad_clinica, vulnerabilidad, nivel_prioridad,
        motivo_urgencia, puntaje_prioridad, creado_por_user_id, modificado_por_user_id,
        es_urgente, sync_status, updated_at
      ) VALUES (
        $id, $nombre_provisorio, $cantidad_animales, $especie, $edad_estimada,
        $historia_origen, $personalidad, $estado_visible, $barrio, $latitud,
        $longitud, $foto_uri, $foto_local_uri, $foto_remote_path, $foto_sync_status,
        $fecha_rescate, $quien_sigue_caso, $transito_nombre,
        $transito_telefono, $transito_correo, $castrado, $virales_vif_vilef,
        $fecha_primera_desparasitacion, $fecha_segunda_desparasitacion,
        $estado_caso, $gravedad_clinica, $vulnerabilidad, $nivel_prioridad,
        $motivo_urgencia, $puntaje_prioridad, $creado_por_user_id, $modificado_por_user_id,
        $es_urgente, $sync_status, $updated_at
      );`,
      params
    );

    // Evento de llegada inicial
    const eventoLlegada: EventoHistorial = {
      id: generarUUID(),
      casoId: caso.id,
      tipo: 'LLEGADA',
      fecha: caso.fechaRescate,
      descripcion: `Llegada a la red PERF en ${caso.barrio}. Cantidad: ${caso.cantidadAnimales}. Coordinador: ${caso.quienSigueCaso || 'No asignado'}.`,
      syncStatus: caso.syncStatus,
    };

    await db.runAsync(
      `INSERT INTO eventos_historial (id, caso_id, tipo, fecha, descripcion, sync_status)
       VALUES ($id, $caso_id, $tipo, $fecha, $descripcion, $sync_status);`,
      eventoToParams(eventoLlegada)
    );

    // Encolar operación pendiente con idempotency_key
    const idempotencyKey = generarUUID();
    await db.runAsync(
      `INSERT INTO operaciones_pendientes (idempotency_key, entidad, operacion, payload, reintentos, created_at)
       VALUES (?, ?, ?, ?, 0, ?);`,
      [idempotencyKey, 'CASO', 'CREATE', JSON.stringify(caso), Date.now()]
    );

    return caso;
  }

  async actualizar(caso: Caso): Promise<Caso> {
    const anterior = await this.obtenerPorId(caso.id);
    if (anterior && (anterior.estadoCaso === 'ADOPTADO' || anterior.estadoCaso === 'FALLECIDO') && caso.estadoCaso !== anterior.estadoCaso) {
      throw new Error(`El caso se encuentra cerrado (${anterior.estadoCaso}) y no admite modificaciones.`);
    }

    const db = await getDatabase();
    const params = casoToParams(caso);

    await db.runAsync(
      `UPDATE casos SET
        nombre_provisorio = $nombre_provisorio,
        cantidad_animales = $cantidad_animales,
        especie = $especie,
        edad_estimada = $edad_estimada,
        historia_origen = $historia_origen,
        personalidad = $personalidad,
        estado_visible = $estado_visible,
        barrio = $barrio,
        latitud = $latitud,
        longitud = $longitud,
        foto_uri = $foto_uri,
        foto_local_uri = $foto_local_uri,
        foto_remote_path = $foto_remote_path,
        foto_sync_status = $foto_sync_status,
        quien_sigue_caso = $quien_sigue_caso,
        transito_nombre = $transito_nombre,
        transito_telefono = $transito_telefono,
        transito_correo = $transito_correo,
        castrado = $castrado,
        virales_vif_vilef = $virales_vif_vilef,
        fecha_primera_desparasitacion = $fecha_primera_desparasitacion,
        fecha_segunda_desparasitacion = $fecha_segunda_desparasitacion,
        estado_caso = $estado_caso,
        gravedad_clinica = $gravedad_clinica,
        vulnerabilidad = $vulnerabilidad,
        nivel_prioridad = $nivel_prioridad,
        motivo_urgencia = $motivo_urgencia,
        puntaje_prioridad = $puntaje_prioridad,
        creado_por_user_id = $creado_por_user_id,
        modificado_por_user_id = $modificado_por_user_id,
        es_urgente = $es_urgente,
        sync_status = $sync_status,
        updated_at = $updated_at
      WHERE id = $id;`,
      params
    );

    // Delta: calcular solo campos modificados
    const changedFields: Record<string, any> = { id: caso.id, updated_at: caso.updatedAt };
    if (anterior) {
      for (const [k, v] of Object.entries(caso)) {
        if (JSON.stringify(v) !== JSON.stringify((anterior as any)[k])) {
          changedFields[k] = v;
        }
      }
    } else {
      Object.assign(changedFields, caso);
    }

    const idempotencyKey = generarUUID();
    await db.runAsync(
      `INSERT INTO operaciones_pendientes (idempotency_key, entidad, operacion, payload, reintentos, created_at)
       VALUES (?, ?, ?, ?, 0, ?);`,
      [idempotencyKey, 'CASO', 'UPDATE', JSON.stringify(changedFields), Date.now()]
    );

    return caso;
  }

  async actualizarEstado(id: string, nuevoEstado: EstadoCaso, motivo?: string): Promise<Caso> {
    const anterior = await this.obtenerPorId(id);
    if (anterior && (anterior.estadoCaso === 'ADOPTADO' || anterior.estadoCaso === 'FALLECIDO')) {
      throw new Error(`El caso ya está cerrado (${anterior.estadoCaso}) y no se puede modificar su estado.`);
    }

    const db = await getDatabase();
    const ahora = Date.now();

    await db.runAsync(
      `UPDATE casos SET estado_caso = ?, sync_status = 'PENDING', updated_at = ? WHERE id = ?;`,
      [nuevoEstado, ahora, id]
    );

    const evento: EventoHistorial = {
      id: generarUUID(),
      casoId: id,
      tipo: 'CAMBIO_TRANSITO',
      fecha: ahora,
      descripcion: motivo ? `Cambio a estado ${nuevoEstado}: ${motivo}` : `Estado actualizado a ${nuevoEstado}`,
      syncStatus: 'PENDING',
    };

    await db.runAsync(
      `INSERT INTO eventos_historial (id, caso_id, tipo, fecha, descripcion, sync_status)
       VALUES ($id, $caso_id, $tipo, $fecha, $descripcion, $sync_status);`,
      eventoToParams(evento)
    );

    const idempotencyKey = generarUUID();
    await db.runAsync(
      `INSERT INTO operaciones_pendientes (idempotency_key, entidad, operacion, payload, reintentos, created_at)
       VALUES (?, ?, ?, ?, 0, ?);`,
      [idempotencyKey, 'CASO', 'UPDATE', JSON.stringify({ id, estadoCaso: nuevoEstado, motivo, updated_at: ahora }), ahora]
    );

    // Si se cierra el caso por adopción o fallecimiento, cancelar recordatorios de turnos pendientes
    if (nuevoEstado === 'ADOPTADO' || nuevoEstado === 'FALLECIDO') {
      try {
        const turnosPendientes = await db.getAllAsync<{ notification_id: string | null }>(
          `SELECT notification_id FROM turnos WHERE caso_id = ? AND cumplido = 0;`,
          [id]
        );
        for (const t of turnosPendientes) {
          if (t.notification_id) {
            await Notifications.cancelScheduledNotificationAsync(t.notification_id).catch(() => { });
          }
        }
      } catch { }
    }

    const actualizado = await this.obtenerPorId(id);
    if (!actualizado) throw new Error('Caso no encontrado tras actualizar');
    return actualizado;
  }

  async resumenAlmacenamiento(): Promise<ResumenAlmacenamiento> {
    const db = await getDatabase();
    const totalActivos = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM casos WHERE estado_caso NOT IN ('ADOPTADO', 'FALLECIDO');`
    );
    const totalArchivados = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM casos WHERE estado_caso IN ('ADOPTADO', 'FALLECIDO');`
    );
    const totalEventos = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM eventos_historial;'
    );
    const totalTurnos = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM turnos;'
    );
    const cantActivos = totalActivos?.count ?? 0;
    const cantArchivados = totalArchivados?.count ?? 0;

    return {
      casosActivos: cantActivos,
      archivados: cantArchivados,
      megabytes: Math.round(((cantActivos + cantArchivados) * 0.15 + (totalEventos?.count ?? 0) * 0.02 + (totalTurnos?.count ?? 0) * 0.01) * 10) / 10,
      capacidadMegabytes: 512,
    };
  }

  async obtenerHistorial(casoId: string): Promise<EventoHistorial[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<EventoHistorialRow>(
      `SELECT * FROM eventos_historial WHERE caso_id = ? ORDER BY fecha DESC;`,
      [casoId]
    );
    return rows.map(eventoFromRow);
  }

  async agregarEvento(evento: EventoHistorial): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO eventos_historial (id, caso_id, tipo, fecha, descripcion, sync_status)
       VALUES ($id, $caso_id, $tipo, $fecha, $descripcion, $sync_status);`,
      eventoToParams(evento)
    );

    const idempotencyKey = generarUUID();
    await db.runAsync(
      `INSERT INTO operaciones_pendientes (idempotency_key, entidad, operacion, payload, reintentos, created_at)
       VALUES (?, ?, ?, ?, 0, ?);`,
      [idempotencyKey, 'HISTORIAL', 'CREATE', JSON.stringify(evento), Date.now()]
    );
  }

  async sincronizar(): Promise<number> {
    const resultado = await sincronizarConSupabase();
    return resultado.enviadas + resultado.descargadas;
  }

  async obtenerOperacionesPendientes(): Promise<OperacionPendiente[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: number;
      idempotency_key?: string | null;
      entidad: string;
      operacion: string;
      payload: string;
      reintentos: number;
      created_at: number;
    }>('SELECT * FROM operaciones_pendientes ORDER BY id ASC;');
    return rows.map((r) => ({
      id: r.id,
      entidad: r.entidad,
      operacion: r.operacion,
      payload: r.payload,
      reintentos: r.reintentos,
      created_at: r.created_at,
    }));
  }

  async leerCola(): Promise<OperacionPendiente[]> {
    return this.obtenerOperacionesPendientes();
  }
}
