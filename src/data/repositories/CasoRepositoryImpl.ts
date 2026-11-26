import * as Notifications from 'expo-notifications';
import { ResumenAlmacenamiento } from '../../domain/models/Ajustes';
import { Caso, EstadoCaso, EventoHistorial } from '../../domain/models/Caso';
import { CasoRepository, OperacionPendiente } from '../../domain/repositories/CasoRepository';
import { AnimalCaso } from '../../domain/models/Animal';
import { conSanidadDelGrupo, crearAnimalesDelCaso, resumenSanidad, sanidadCambio } from '../../domain/services/AnimalesDelCaso';
import { getDatabase } from '../local/Database';
import { generarUUID } from '../local/uuid';
import {
  AnimalRow,
  animalFromRow,
  animalToParams,
  casoFromRow,
  casoToParams,
  eventoFromRow,
  eventoToParams,
  CasoRow,
  EventoHistorialRow,
  SQL_CASO_CON_REVISION,
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
      `${SQL_CASO_CON_REVISION} WHERE c.estado_caso NOT IN ('ADOPTADO', 'FALLECIDO') ORDER BY c.puntaje_prioridad DESC, c.fecha_rescate DESC;`
    );
    return rows.map(casoFromRow);
  }

  async obtenerArchivados(): Promise<Caso[]> {
    await this.asegurarSemilla();
    const db = await getDatabase();
    const rows = await db.getAllAsync<CasoRow>(
      `${SQL_CASO_CON_REVISION} WHERE c.estado_caso IN ('ADOPTADO', 'FALLECIDO') ORDER BY c.updated_at DESC;`
    );
    return rows.map(casoFromRow);
  }

  async obtenerTodos(): Promise<Caso[]> {
    await this.asegurarSemilla();
    const db = await getDatabase();
    const rows = await db.getAllAsync<CasoRow>(
      `${SQL_CASO_CON_REVISION} ORDER BY c.fecha_rescate DESC;`
    );
    return rows.map(casoFromRow);
  }

  async obtenerPorId(id: string): Promise<Caso | undefined> {
    await this.asegurarSemilla();
    const db = await getDatabase();
    const row = await db.getFirstAsync<CasoRow>(
      `${SQL_CASO_CON_REVISION} WHERE c.id = ?;`,
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

    // Cada animal del caso arranca con la ficha sanitaria del grupo. Viajan al servidor junto con el caso.
    for (const animal of crearAnimalesDelCaso(caso, generarUUID)) {
      await db.runAsync(
        `INSERT INTO animales (
           id, caso_id, nombre, castrado, virales_vif_vilef, embarazada, peso_gramos,
           fecha_primera_desparasitacion, fecha_segunda_desparasitacion,
           fallecido, motivo_fallecimiento, sync_status, updated_at
         ) VALUES (
           $id, $caso_id, $nombre, $castrado, $virales_vif_vilef, $embarazada, $peso_gramos,
           $fecha_primera_desparasitacion, $fecha_segunda_desparasitacion,
           $fallecido, $motivo_fallecimiento, $sync_status, $updated_at
         );`,
        animalToParams({ ...animal, syncStatus: caso.syncStatus })
      );
    }

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

    // Se encola el caso completo: el motor lo compara con la ultima version conocida del servidor y
    // manda solo los campos que cambiaron (con nombres de columna que el servidor entiende).
    const changedFields = caso;

    const idempotencyKey = generarUUID();
    await db.runAsync(
      `INSERT INTO operaciones_pendientes (idempotency_key, entidad, operacion, payload, reintentos, created_at)
       VALUES (?, ?, ?, ?, 0, ?);`,
      [idempotencyKey, 'CASO', 'UPDATE', JSON.stringify(changedFields), Date.now()]
    );

    // La pantalla edita la ficha del grupo: se aplica a cada animal del caso y viaja como cambio propio.
    if (anterior && sanidadCambio(anterior.sanidad, caso.sanidad)) {
      await this.aplicarSanidadAAnimales(caso);
    }

    return caso;
  }

  async obtenerAnimales(casoId: string): Promise<AnimalCaso[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<AnimalRow>('SELECT * FROM animales WHERE caso_id = ? ORDER BY nombre ASC;', [casoId]);
    return rows.map(animalFromRow);
  }

  async actualizarAnimal(animal: AnimalCaso): Promise<AnimalCaso> {
    const db = await getDatabase();
    const ahora = Date.now();
    const guardado: AnimalCaso = { ...animal, syncStatus: 'PENDING', updatedAt: ahora };
    await db.runAsync(
      `UPDATE animales SET nombre = $nombre, castrado = $castrado, virales_vif_vilef = $virales_vif_vilef,
         embarazada = $embarazada, peso_gramos = $peso_gramos,
         fecha_primera_desparasitacion = $fecha_primera_desparasitacion,
         fecha_segunda_desparasitacion = $fecha_segunda_desparasitacion,
         fallecido = $fallecido, motivo_fallecimiento = $motivo_fallecimiento,
         sync_status = $sync_status, updated_at = $updated_at
       WHERE id = $id;`,
      animalToParams(guardado)
    );
    await db.runAsync(
      `INSERT INTO operaciones_pendientes (idempotency_key, entidad, operacion, payload, reintentos, created_at)
       VALUES (?, ?, ?, ?, 0, ?);`,
      [generarUUID(), 'ANIMAL', 'UPDATE', JSON.stringify(guardado), ahora]
    );

    // La ficha del caso es el resumen del grupo: se actualiza sin tocar la de los demas animales.
    const caso = await this.obtenerPorId(animal.casoId);
    const resumen = resumenSanidad(await this.obtenerAnimales(animal.casoId));
    if (caso && resumen && sanidadCambio(caso.sanidad, resumen)) {
      const conResumen: Caso = { ...caso, sanidad: resumen, syncStatus: 'PENDING', updatedAt: ahora };
      await db.runAsync(
        `UPDATE casos SET castrado = $castrado, virales_vif_vilef = $virales,
           fecha_primera_desparasitacion = $d1, fecha_segunda_desparasitacion = $d2,
           sync_status = 'PENDING', updated_at = $ahora WHERE id = $id;`,
        {
          $id: caso.id,
          $castrado: resumen.castrado,
          $virales: resumen.virales,
          $d1: resumen.fechaPrimeraDesparasitacion ?? null,
          $d2: resumen.fechaSegundaDesparasitacion ?? null,
          $ahora: ahora,
        }
      );
      await db.runAsync(
        `INSERT INTO operaciones_pendientes (idempotency_key, entidad, operacion, payload, reintentos, created_at)
         VALUES (?, ?, ?, ?, 0, ?);`,
        [generarUUID(), 'CASO', 'UPDATE', JSON.stringify(conResumen), ahora]
      );
    }
    return guardado;
  }

  private async aplicarSanidadAAnimales(caso: Caso): Promise<void> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<AnimalRow>('SELECT * FROM animales WHERE caso_id = ?;', [caso.id]);
    const ahora = Date.now();
    for (const row of rows) {
      const animal = conSanidadDelGrupo(animalFromRow(row), caso.sanidad, ahora);
      await db.runAsync(
        `UPDATE animales SET castrado = $castrado, virales_vif_vilef = $virales_vif_vilef,
           fecha_primera_desparasitacion = $fecha_primera_desparasitacion,
           fecha_segunda_desparasitacion = $fecha_segunda_desparasitacion,
           sync_status = $sync_status, updated_at = $updated_at
         WHERE id = $id;`,
        {
          $id: animal.id,
          $castrado: animal.castrado,
          $virales_vif_vilef: animal.virales,
          $fecha_primera_desparasitacion: animal.fechaPrimeraDesparasitacion ?? null,
          $fecha_segunda_desparasitacion: animal.fechaSegundaDesparasitacion ?? null,
          $sync_status: animal.syncStatus,
          $updated_at: animal.updatedAt,
        }
      );
      await db.runAsync(
        `INSERT INTO operaciones_pendientes (idempotency_key, entidad, operacion, payload, reintentos, created_at)
         VALUES (?, ?, ?, ?, 0, ?);`,
        [generarUUID(), 'ANIMAL', 'UPDATE', JSON.stringify(animal), ahora]
      );
    }
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
