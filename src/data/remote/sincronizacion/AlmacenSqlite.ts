import {
  Caso,
  Coordinador,
  EventoHistorial,
  RegistroTestAnimal,
  RelacionAnimal,
  TestViralFijo,
} from '../../../domain/models/Caso';
import { AnimalCaso } from '../../../domain/models/Animal';
import { CentroVeterinario, Turno } from '../../../domain/models/Turno';
import { getDatabase } from '../../local/Database';
import {
  AnimalRow,
  CasoRow,
  EventoHistorialRow,
  RelacionAnimalRow,
  ResultadoTestAnimalRow,
  SQL_CASO_CON_REVISION,
  TurnoRow,
  animalFromRow,
  animalToParams,
  casoFromRow,
  casoToParams,
  eventoFromRow,
  eventoToParams,
  relacionFromRow,
  relacionToParams,
  resultadoTestFromRow,
  resultadoTestToParams,
  turnoFromRow,
  turnoToParams,
} from '../../mappers/CasoMapper';
import { AlmacenLocal, OperacionCola } from './MotorSincronizacion';

/** Almacenamiento local del motor, sobre la base SQLite de la app. */
export const almacenSqlite: AlmacenLocal = {
  async leerCola() {
    const db = await getDatabase();
    return db.getAllAsync<OperacionCola>(
      `SELECT id, idempotency_key AS idempotencyKey, entidad, operacion, payload, reintentos, created_at AS createdAt
         FROM operaciones_pendientes ORDER BY id ASC;`
    );
  },

  async quitarDeCola(id) {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM operaciones_pendientes WHERE id = ?;', [id]);
  },

  async registrarFallo(id) {
    const db = await getDatabase();
    await db.runAsync('UPDATE operaciones_pendientes SET reintentos = reintentos + 1 WHERE id = ?;', [id]);
  },

  async obtenerCaso(id) {
    const db = await getDatabase();
    const row = await db.getFirstAsync<CasoRow>(`${SQL_CASO_CON_REVISION} WHERE c.id = ?;`, [id]);
    return row ? casoFromRow(row) : undefined;
  },

  // Lo que baja del servidor reemplaza la fila local, pero la foto local se conserva.
  async guardarCaso(caso: Caso) {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO casos (
         id, nombre_provisorio, cantidad_animales, especie, especie_detalle, edad_estimada,
         historia_origen, personalidad, estado_visible, barrio, latitud,
         longitud, foto_uri, foto_local_uri, foto_remote_path, foto_sync_status,
         fecha_rescate, quien_sigue_caso, coordinador_id, transito_nombre,
         transito_telefono, transito_correo, castrado, virales_vif_vilef,
         fecha_primera_desparasitacion, fecha_segunda_desparasitacion,
         estado_caso, gravedad_clinica, vulnerabilidad, nivel_prioridad,
         motivo_urgencia, puntaje_prioridad, creado_por_user_id, creado_por_nombre, modificado_por_user_id,
         es_urgente, sync_status, updated_at
       ) VALUES (
         $id, $nombre_provisorio, $cantidad_animales, $especie, $especie_detalle, $edad_estimada,
         $historia_origen, $personalidad, $estado_visible, $barrio, $latitud,
         $longitud, $foto_uri, $foto_local_uri, $foto_remote_path, $foto_sync_status,
         $fecha_rescate, $quien_sigue_caso, $coordinador_id, $transito_nombre,
         $transito_telefono, $transito_correo, $castrado, $virales_vif_vilef,
         $fecha_primera_desparasitacion, $fecha_segunda_desparasitacion,
         $estado_caso, $gravedad_clinica, $vulnerabilidad, $nivel_prioridad,
         $motivo_urgencia, $puntaje_prioridad, $creado_por_user_id, $creado_por_nombre, $modificado_por_user_id,
         $es_urgente, $sync_status, $updated_at
       )
       ON CONFLICT(id) DO UPDATE SET
         nombre_provisorio = excluded.nombre_provisorio,
         cantidad_animales = excluded.cantidad_animales,
         especie = excluded.especie,
         especie_detalle = excluded.especie_detalle,
         edad_estimada = excluded.edad_estimada,
         historia_origen = excluded.historia_origen,
         personalidad = excluded.personalidad,
         estado_visible = excluded.estado_visible,
         barrio = excluded.barrio,
         latitud = excluded.latitud,
         longitud = excluded.longitud,
         foto_remote_path = coalesce(excluded.foto_remote_path, casos.foto_remote_path),
         fecha_rescate = excluded.fecha_rescate,
         quien_sigue_caso = excluded.quien_sigue_caso,
         coordinador_id = excluded.coordinador_id,
         transito_nombre = excluded.transito_nombre,
         transito_telefono = excluded.transito_telefono,
         transito_correo = excluded.transito_correo,
         castrado = excluded.castrado,
         virales_vif_vilef = excluded.virales_vif_vilef,
         fecha_primera_desparasitacion = excluded.fecha_primera_desparasitacion,
         fecha_segunda_desparasitacion = excluded.fecha_segunda_desparasitacion,
         estado_caso = excluded.estado_caso,
         gravedad_clinica = excluded.gravedad_clinica,
         vulnerabilidad = excluded.vulnerabilidad,
         nivel_prioridad = excluded.nivel_prioridad,
         motivo_urgencia = excluded.motivo_urgencia,
         puntaje_prioridad = excluded.puntaje_prioridad,
         creado_por_nombre = coalesce(excluded.creado_por_nombre, casos.creado_por_nombre),
         modificado_por_user_id = excluded.modificado_por_user_id,
         es_urgente = excluded.es_urgente,
         sync_status = 'SYNCED',
         updated_at = excluded.updated_at;`,
      casoToParams(caso)
    );
  },

  async guardarEvento(evento: EventoHistorial) {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR IGNORE INTO eventos_historial (id, caso_id, tipo, fecha, descripcion, sync_status)
       VALUES ($id, $caso_id, $tipo, $fecha, $descripcion, $sync_status);`,
      eventoToParams(evento)
    );
    await db.runAsync(`UPDATE eventos_historial SET sync_status = 'SYNCED' WHERE id = ?;`, [evento.id]);
  },

  async leerEventosPendientes() {
    const db = await getDatabase();
    const rows = await db.getAllAsync<EventoHistorialRow>(
      `SELECT * FROM eventos_historial WHERE sync_status = 'PENDING' ORDER BY fecha ASC;`
    );
    return rows.map(eventoFromRow);
  },

  async leerEventosDeCaso(casoId: string) {
    const db = await getDatabase();
    const rows = await db.getAllAsync<EventoHistorialRow>(
      `SELECT * FROM eventos_historial WHERE caso_id = ? ORDER BY fecha ASC;`,
      [casoId]
    );
    return rows.map(eventoFromRow);
  },

  async marcarEventoSincronizado(id: string) {
    const db = await getDatabase();
    await db.runAsync(`UPDATE eventos_historial SET sync_status = 'SYNCED' WHERE id = ?;`, [id]);
  },

  // Lo que baja del servidor reemplaza la ficha local del animal.
  async guardarAnimal(animal: AnimalCaso) {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO animales (
         id, caso_id, nombre, castrado, virales_vif_vilef, embarazada, peso_gramos,
         fecha_primera_desparasitacion, fecha_segunda_desparasitacion,
         fallecido, motivo_fallecimiento, sync_status, updated_at
       ) VALUES (
         $id, $caso_id, $nombre, $castrado, $virales_vif_vilef, $embarazada, $peso_gramos,
         $fecha_primera_desparasitacion, $fecha_segunda_desparasitacion,
         $fallecido, $motivo_fallecimiento, $sync_status, $updated_at
       )
       ON CONFLICT(id) DO UPDATE SET
         nombre = excluded.nombre,
         castrado = excluded.castrado,
         virales_vif_vilef = excluded.virales_vif_vilef,
         embarazada = excluded.embarazada,
         peso_gramos = excluded.peso_gramos,
         fecha_primera_desparasitacion = excluded.fecha_primera_desparasitacion,
         fecha_segunda_desparasitacion = excluded.fecha_segunda_desparasitacion,
         fallecido = excluded.fallecido,
         motivo_fallecimiento = excluded.motivo_fallecimiento,
         sync_status = 'SYNCED',
         updated_at = excluded.updated_at;`,
      animalToParams(animal)
    );
  },

  async leerAnimalesDeCaso(casoId: string) {
    const db = await getDatabase();
    const rows = await db.getAllAsync<AnimalRow>('SELECT * FROM animales WHERE caso_id = ? ORDER BY nombre ASC;', [casoId]);
    return rows.map(animalFromRow);
  },

  async marcarAnimalSincronizado(id: string) {
    const db = await getDatabase();
    await db.runAsync(`UPDATE animales SET sync_status = 'SYNCED' WHERE id = ?;`, [id]);
  },

  async reemplazarCentros(centros: CentroVeterinario[]) {
    const db = await getDatabase();
    for (const c of centros) await guardarCentroLocal(c);
    // Lo que ya no está en el servidor (el catálogo de prueba o una baja) se saca del teléfono.
    const marcas = centros.map(() => '?').join(', ');
    await db.runAsync(`DELETE FROM centros_veterinarios WHERE id NOT IN (${marcas});`, centros.map((c) => c.id));
  },

  async guardarTurno(turno: Turno) {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO turnos (
         id, caso_id, centro_veterinario_id, fecha_hora, motivo,
         recordatorio_minutos, cumplido, notification_id, sync_status, updated_at
       ) VALUES (
         $id, $caso_id, $centro_veterinario_id, $fecha_hora, $motivo,
         $recordatorio_minutos, $cumplido, $notification_id, $sync_status, $updated_at
       )
       ON CONFLICT(id) DO UPDATE SET
         caso_id = excluded.caso_id,
         centro_veterinario_id = excluded.centro_veterinario_id,
         fecha_hora = excluded.fecha_hora,
         motivo = excluded.motivo,
         recordatorio_minutos = excluded.recordatorio_minutos,
         cumplido = excluded.cumplido,
         notification_id = coalesce(excluded.notification_id, turnos.notification_id),
         sync_status = 'SYNCED',
         updated_at = excluded.updated_at;`,
      turnoToParams(turno)
    );
  },

  async reemplazarCoordinadores(coords: Coordinador[]) {
    const db = await getDatabase();
    for (const c of coords) {
      await db.runAsync(
        `INSERT INTO coordinadores (id, nombre, perfil_id, activo)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           nombre = excluded.nombre,
           perfil_id = excluded.perfil_id,
           activo = excluded.activo;`,
        [c.id, c.nombre, c.perfilId ?? null, c.activo ? 1 : 0]
      );
    }
    if (coords.length > 0) {
      const marcas = coords.map(() => '?').join(', ');
      await db.runAsync(`DELETE FROM coordinadores WHERE id NOT IN (${marcas});`, coords.map((c) => c.id));
    }
  },

  async reemplazarCatalogoTests(tests: TestViralFijo[]) {
    const db = await getDatabase();
    for (const t of tests) {
      await db.runAsync(
        `INSERT INTO tests_virales (id, nombre, especie, orden, activo)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           nombre = excluded.nombre,
           especie = excluded.especie,
           orden = excluded.orden,
           activo = excluded.activo;`,
        [t.id, t.nombre, t.especie, t.orden, t.activo ? 1 : 0]
      );
    }
  },

  async guardarResultadoTest(reg: RegistroTestAnimal) {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO resultados_tests_animal (
         id, caso_id, animal_id, test_id, resultado, fecha_test, observaciones, registrado_por, sync_status, updated_at
       ) VALUES (
         $id, $caso_id, $animal_id, $test_id, $resultado, $fecha_test, $observaciones, $registrado_por, $sync_status, $updated_at
       )
       ON CONFLICT(id) DO UPDATE SET
         resultado = excluded.resultado,
         fecha_test = excluded.fecha_test,
         observaciones = excluded.observaciones,
         registrado_por = excluded.registrado_por,
         sync_status = 'SYNCED',
         updated_at = excluded.updated_at;`,
      resultadoTestToParams(reg, 'SYNCED')
    );
  },

  async leerResultadosTestsDeCaso(casoId: string) {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ResultadoTestAnimalRow>(
      'SELECT * FROM resultados_tests_animal WHERE caso_id = ?;',
      [casoId]
    );
    return rows.map(resultadoTestFromRow);
  },

  async marcarResultadoTestSincronizado(id: string) {
    const db = await getDatabase();
    await db.runAsync(`UPDATE resultados_tests_animal SET sync_status = 'SYNCED' WHERE id = ?;`, [id]);
  },

  async guardarRelacion(rel: RelacionAnimal) {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO relaciones_animales (
         id, caso_origen_id, tipo_relacion, caso_destino_id, nombre_destino, sync_status, updated_at
       ) VALUES (
         $id, $caso_origen_id, $tipo_relacion, $caso_destino_id, $nombre_destino, $sync_status, $updated_at
       )
       ON CONFLICT(id) DO UPDATE SET
         tipo_relacion = excluded.tipo_relacion,
         caso_destino_id = excluded.caso_destino_id,
         nombre_destino = excluded.nombre_destino,
         sync_status = 'SYNCED',
         updated_at = excluded.updated_at;`,
      relacionToParams(rel, 'SYNCED')
    );
  },

  async leerRelacionesDeCaso(casoId: string) {
    const db = await getDatabase();
    const rows = await db.getAllAsync<RelacionAnimalRow>(
      'SELECT * FROM relaciones_animales WHERE caso_origen_id = ?;',
      [casoId]
    );
    return rows.map(relacionFromRow);
  },

  async marcarRelacionSincronizada(id: string) {
    const db = await getDatabase();
    await db.runAsync(`UPDATE relaciones_animales SET sync_status = 'SYNCED' WHERE id = ?;`, [id]);
  },
};

/** Alta o cambio de una veterinaria en la base del teléfono. */
export async function guardarCentroLocal(c: CentroVeterinario): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO centros_veterinarios (id, nombre, medico, barrio, direccion, telefono, detalle, distancia, abierto, tipo, horarios, dias_atencion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       nombre = excluded.nombre, medico = excluded.medico, barrio = excluded.barrio,
       direccion = excluded.direccion, telefono = excluded.telefono, detalle = excluded.detalle,
       distancia = excluded.distancia, abierto = excluded.abierto, tipo = excluded.tipo,
       horarios = excluded.horarios, dias_atencion = excluded.dias_atencion;`,
    [
      c.id,
      c.nombre,
      c.medico ?? null,
      c.barrio,
      c.direccion,
      c.telefono,
      c.detalle ?? null,
      c.distancia ?? null,
      c.abierto ? 1 : 0,
      c.tipo,
      JSON.stringify(c.horarios ?? []),
      c.diasAtencion?.length ? JSON.stringify(c.diasAtencion) : null,
    ]
  );
}
