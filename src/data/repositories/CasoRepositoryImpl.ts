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

export class CasoRepositoryImpl implements CasoRepository {
  private seeded = false;

  private async asegurarSemilla(): Promise<void> {
    if (this.seeded) return;
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
            longitud, foto_uri, fecha_rescate, quien_sigue_caso, transito_nombre,
            transito_telefono, transito_correo, castrado, virales_vif_vilef,
            fecha_primera_desparasitacion, fecha_segunda_desparasitacion,
            estado_caso, es_urgente, sync_status, updated_at
          ) VALUES (
            $id, $nombre_provisorio, $cantidad_animales, $especie, $edad_estimada,
            $historia_origen, $personalidad, $estado_visible, $barrio, $latitud,
            $longitud, $foto_uri, $fecha_rescate, $quien_sigue_caso, $transito_nombre,
            $transito_telefono, $transito_correo, $castrado, $virales_vif_vilef,
            $fecha_primera_desparasitacion, $fecha_segunda_desparasitacion,
            $estado_caso, $es_urgente, $sync_status, $updated_at
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
      `SELECT * FROM casos WHERE estado_caso NOT IN ('ADOPTADO', 'FALLECIDO') ORDER BY fecha_rescate DESC;`
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
        longitud, foto_uri, fecha_rescate, quien_sigue_caso, transito_nombre,
        transito_telefono, transito_correo, castrado, virales_vif_vilef,
        fecha_primera_desparasitacion, fecha_segunda_desparasitacion,
        estado_caso, es_urgente, sync_status, updated_at
      ) VALUES (
        $id, $nombre_provisorio, $cantidad_animales, $especie, $edad_estimada,
        $historia_origen, $personalidad, $estado_visible, $barrio, $latitud,
        $longitud, $foto_uri, $fecha_rescate, $quien_sigue_caso, $transito_nombre,
        $transito_telefono, $transito_correo, $castrado, $virales_vif_vilef,
        $fecha_primera_desparasitacion, $fecha_segunda_desparasitacion,
        $estado_caso, $es_urgente, $sync_status, $updated_at
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

    // Encolar operación pendiente para Offline First
    await db.runAsync(
      `INSERT INTO operaciones_pendientes (entidad, operacion, payload, reintentos, created_at)
       VALUES (?, ?, ?, 0, ?);`,
      ['CASO', 'CREATE', JSON.stringify(caso), Date.now()]
    );

    return caso;
  }

  async actualizar(caso: Caso): Promise<Caso> {
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
        quien_sigue_caso = $quien_sigue_caso,
        transito_nombre = $transito_nombre,
        transito_telefono = $transito_telefono,
        transito_correo = $transito_correo,
        castrado = $castrado,
        virales_vif_vilef = $virales_vif_vilef,
        fecha_primera_desparasitacion = $fecha_primera_desparasitacion,
        fecha_segunda_desparasitacion = $fecha_segunda_desparasitacion,
        estado_caso = $estado_caso,
        es_urgente = $es_urgente,
        sync_status = $sync_status,
        updated_at = $updated_at
      WHERE id = $id;`,
      params
    );

    await db.runAsync(
      `INSERT INTO operaciones_pendientes (entidad, operacion, payload, reintentos, created_at)
       VALUES (?, ?, ?, 0, ?);`,
      ['CASO', 'UPDATE', JSON.stringify(caso), Date.now()]
    );

    return caso;
  }

  async actualizarEstado(id: string, nuevoEstado: EstadoCaso, motivo?: string): Promise<Caso> {
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

    await db.runAsync(
      `INSERT INTO operaciones_pendientes (entidad, operacion, payload, reintentos, created_at)
       VALUES (?, ?, ?, 0, ?);`,
      ['CASO', 'UPDATE', JSON.stringify({ id, estadoCaso: nuevoEstado, motivo }), ahora]
    );

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
      megabytes: Math.round((cantActivos + cantArchivados) * 0.45 * 10) / 10,
      capacidadMegabytes: 50,
    };
  }

  async sincronizar(): Promise<number> {
    const db = await getDatabase();
    const pendientes = await db.getAllAsync<{ id: number; entidad: string; payload: string }>(
      'SELECT * FROM operaciones_pendientes ORDER BY id ASC;'
    );

    if (pendientes.length === 0) return 0;

    // Marcamos todas las tablas locales como SYNCED
    await db.runAsync(`UPDATE casos SET sync_status = 'SYNCED';`);
    await db.runAsync(`UPDATE turnos SET sync_status = 'SYNCED';`);
    await db.runAsync(`UPDATE eventos_historial SET sync_status = 'SYNCED';`);
    await db.runAsync('DELETE FROM operaciones_pendientes;');

    return pendientes.length;
  }

  async obtenerOperacionesPendientes(): Promise<OperacionPendiente[]> {
    const db = await getDatabase();
    return await db.getAllAsync<OperacionPendiente>(
      'SELECT id, entidad, operacion, payload, reintentos, created_at FROM operaciones_pendientes ORDER BY id DESC;'
    );
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

    await db.runAsync(
      `INSERT INTO operaciones_pendientes (entidad, operacion, payload, reintentos, created_at)
       VALUES (?, ?, ?, 0, ?);`,
      ['HISTORIAL', 'CREATE', JSON.stringify(evento), Date.now()]
    );
  }
}
