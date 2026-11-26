import * as Notifications from 'expo-notifications';
import { ResumenAlmacenamiento } from '../../domain/models/Ajustes';
import {
  COORDINADORES_FIJOS,
  Caso,
  Coordinador,
  Especie,
  EstadoCaso,
  EstadoVirales,
  EventoHistorial,
  RegistroTestAnimal,
  RelacionAnimal,
  ResultadoTestViral,
  TESTS_VIRALES_FIJOS,
  TestViralFijo,
  testsPorEspecie,
} from '../../domain/models/Caso';
import {
  CasoRepository,
  OpcionesActualizacionEstado,
  OperacionPendiente,
} from '../../domain/repositories/CasoRepository';
import { AnimalCaso } from '../../domain/models/Animal';
import { conSanidadDelGrupo, crearAnimalesDelCaso, resumenSanidad, sanidadCambio } from '../../domain/services/AnimalesDelCaso';
import { calcularPrioridadCasoUseCase } from '../../domain/usecases/CalcularPrioridadCasoUseCase';
import { AjustesRepositoryImpl } from '../local/AjustesRepositoryImpl';
import { getDatabase } from '../local/Database';
import { esModoDemo, purgarDatosDemoDeDb } from '../local/ModoDemo';
import { generarUUID } from '../local/uuid';
import {
  AnimalRow,
  animalFromRow,
  animalToParams,
  casoFromRow,
  casoToParams,
  coordinadorFromRow,
  CoordinadorRow,
  eventoFromRow,
  eventoToParams,
  relacionFromRow,
  RelacionAnimalRow,
  relacionToParams,
  resultadoTestFromRow,
  ResultadoTestAnimalRow,
  resultadoTestToParams,
  testViralFromRow,
  TestViralRow,
  CasoRow,
  EventoHistorialRow,
  SQL_CASO_CON_REVISION,
} from '../mappers/CasoMapper';
import { casosMock, IDS_CASOS_MOCK_ANTERIORES, RELACIONES_DEMO } from '../mock/casosMock';
import { clinicasMock } from '../mock/turnosMock';
import { sincronizarConSupabase } from '../remote/sincronizacion/SincronizadorSupabase';

function resultadoInicialTestGato(testId: string, virales: EstadoVirales): ResultadoTestViral {
  if (virales === 'NEGATIVO') return 'NEGATIVO';
  if (virales === 'AMBOS_POSITIVOS') return 'POSITIVO';
  if (testId === 'vif') return virales === 'VIF_POSITIVO' ? 'POSITIVO' : virales === 'VILEF_POSITIVO' ? 'NEGATIVO' : 'PENDIENTE';
  if (testId === 'vilef') return virales === 'VILEF_POSITIVO' ? 'POSITIVO' : virales === 'VIF_POSITIVO' ? 'NEGATIVO' : 'PENDIENTE';
  return 'PENDIENTE';
}

export class CasoRepositoryImpl implements CasoRepository {
  private seededDemo = false;
  private purgadoModoReal = false;
  private siembra: Promise<void> | null = null;

  private async asegurarCatalogosBase(): Promise<void> {
    const db = await getDatabase();
    const coordCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM coordinadores;');
    if (!coordCount || coordCount.count === 0) {
      for (const c of COORDINADORES_FIJOS) {
        await db.runAsync(
          'INSERT OR IGNORE INTO coordinadores (id, nombre, perfil_id, activo) VALUES (?, ?, ?, ?);',
          [c.id, c.nombre, c.perfilId ?? null, c.activo ? 1 : 0]
        );
      }
    }
    const testsCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM tests_virales;');
    if (!testsCount || testsCount.count === 0) {
      for (const t of TESTS_VIRALES_FIJOS) {
        await db.runAsync(
          'INSERT OR IGNORE INTO tests_virales (id, nombre, especie, orden, activo) VALUES (?, ?, ?, ?, ?);',
          [t.id, t.nombre, t.especie, t.orden, t.activo ? 1 : 0]
        );
      }
    }
  }

  // En arranque real la app inicia vacía (solo catálogos fijos); en Modo Demo se siembran casosMock.
  private async asegurarSemilla(): Promise<void> {
    await this.asegurarCatalogosBase();
    const demo = await esModoDemo();
    if (!demo) {
      if (this.seededDemo || !this.purgadoModoReal) {
        const db = await getDatabase();
        await purgarDatosDemoDeDb(
          db as any,
          [...casosMock.map((c) => c.id), ...IDS_CASOS_MOCK_ANTERIORES],
          clinicasMock.map((c) => c.id)
        );
        this.seededDemo = false;
        this.purgadoModoReal = true;
        this.siembra = null;
      }
      return;
    }

    if (this.seededDemo) return;
    this.siembra ??= this.sembrarDemo().catch((e) => {
      this.siembra = null;
      throw e;
    });
    return this.siembra;
  }

  private async sembrarDemo(): Promise<void> {
    const db = await getDatabase();
    this.purgadoModoReal = false;

    const countResult = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM casos;'
    );
    if (!countResult || countResult.count === 0) {
      for (const oldId of IDS_CASOS_MOCK_ANTERIORES) {
        await db.runAsync('DELETE FROM resultados_tests_animal WHERE caso_id = ?;', [oldId]);
        await db.runAsync('DELETE FROM animales WHERE caso_id = ?;', [oldId]);
        await db.runAsync('DELETE FROM turnos WHERE caso_id = ?;', [oldId]);
        await db.runAsync('DELETE FROM eventos_historial WHERE caso_id = ?;', [oldId]);
        await db.runAsync('DELETE FROM casos WHERE id = ?;', [oldId]);
      }

      for (const caso of casosMock) {
        const existe = await db.getFirstAsync<{ id: string }>(
          'SELECT id FROM casos WHERE id = ?;',
          [caso.id]
        );
        if (!existe) {
          const coordFijo = COORDINADORES_FIJOS.find(
            (k) => k.nombre.toLowerCase() === (caso.quienSigueCaso || '').trim().toLowerCase()
          );
          const conCoord: Caso = {
            ...caso,
            coordinadorId: caso.coordinadorId ?? coordFijo?.id ?? null,
          };
          const params = casoToParams(conCoord);
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
            );`,
            params
          );

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

          for (const t of testsPorEspecie(caso.especie)) {
            const resTest: ResultadoTestViral =
              caso.especie === 'Gato'
                ? resultadoInicialTestGato(t.id, caso.sanidad.virales)
                : caso.gravedadClinica === 'SANA'
                  ? 'NEGATIVO'
                  : 'PENDIENTE';
            const registro: RegistroTestAnimal = {
              id: generarUUID(),
              casoId: caso.id,
              animalId: null,
              testId: t.id,
              resultado: resTest,
              fechaTest: resTest === 'PENDIENTE' ? null : caso.fechaRescate,
              updatedAt: caso.updatedAt,
            };
            await db.runAsync(
              `INSERT INTO resultados_tests_animal (
                 id, caso_id, animal_id, test_id, resultado, fecha_test, observaciones, registrado_por, sync_status, updated_at
               ) VALUES (
                 $id, $caso_id, $animal_id, $test_id, $resultado, $fecha_test, $observaciones, $registrado_por, $sync_status, $updated_at
               );`,
              resultadoTestToParams(registro, 'SYNCED')
            );
          }
        }

        const animalesCount = await db.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) as count FROM animales WHERE caso_id = ?;',
          [caso.id]
        );
        if (!animalesCount || animalesCount.count === 0) {
          for (const animal of crearAnimalesDelCaso(caso, generarUUID, caso.updatedAt)) {
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
              animalToParams({ ...animal, syncStatus: 'SYNCED' })
            );
          }
        }
      }

      for (const rel of RELACIONES_DEMO) {
        await db.runAsync(
          `INSERT OR IGNORE INTO relaciones_animales (
             id, caso_origen_id, tipo_relacion, caso_destino_id, nombre_destino, sync_status, updated_at
           ) VALUES (
             $id, $caso_origen_id, $tipo_relacion, $caso_destino_id, $nombre_destino, $sync_status, $updated_at
           );`,
          relacionToParams(rel, 'SYNCED')
        );
      }
    }
    this.seededDemo = true;
  }

  private async hidratarCasos(rows: CasoRow[]): Promise<Caso[]> {
    if (rows.length === 0) return [];
    const db = await getDatabase();
    const [testRows, coordRows, relRows] = await Promise.all([
      db.getAllAsync<ResultadoTestAnimalRow>('SELECT * FROM resultados_tests_animal;'),
      db.getAllAsync<CoordinadorRow>('SELECT * FROM coordinadores;'),
      db.getAllAsync<RelacionAnimalRow>('SELECT * FROM relaciones_animales;'),
    ]);

    const testsPorCaso = new Map<string, RegistroTestAnimal[]>();
    for (const tr of testRows) {
      const lista = testsPorCaso.get(tr.caso_id) ?? [];
      lista.push(resultadoTestFromRow(tr));
      testsPorCaso.set(tr.caso_id, lista);
    }

    const relsPorCaso = new Map<string, RelacionAnimal[]>();
    for (const rr of relRows) {
      const rel = relacionFromRow(rr);
      const l1 = relsPorCaso.get(rel.casoOrigenId) ?? [];
      l1.push(rel);
      relsPorCaso.set(rel.casoOrigenId, l1);
      if (rel.casoDestinoId && rel.casoDestinoId !== rel.casoOrigenId) {
        const l2 = relsPorCaso.get(rel.casoDestinoId) ?? [];
        l2.push(rel);
        relsPorCaso.set(rel.casoDestinoId, l2);
      }
    }

    const coordPorId = new Map<string, CoordinadorRow>();
    const coordPorNombre = new Map<string, CoordinadorRow>();
    for (const c of coordRows) {
      coordPorId.set(c.id, c);
      coordPorNombre.set(c.nombre.trim().toLowerCase(), c);
    }

    return rows.map((r) => {
      const coord =
        (r.coordinador_id ? coordPorId.get(r.coordinador_id) : undefined) ??
        (r.quien_sigue_caso ? coordPorNombre.get(r.quien_sigue_caso.trim().toLowerCase()) : undefined);
      return casoFromRow(r, {
        testsAnimal: testsPorCaso.get(r.id),
        coordinadorPerfilId: coord?.perfil_id ?? null,
        relaciones: relsPorCaso.get(r.id) ?? [],
      });
    });
  }

  async obtenerActivos(): Promise<Caso[]> {
    await this.asegurarSemilla();
    const db = await getDatabase();
    const rows = await db.getAllAsync<CasoRow>(
      `${SQL_CASO_CON_REVISION} WHERE c.estado_caso NOT IN ('ADOPTADO', 'FALLECIDO') ORDER BY c.puntaje_prioridad DESC, c.fecha_rescate DESC;`
    );
    const hidratados = await this.hidratarCasos(rows);
    return hidratados.sort(
      (a, b) => b.puntajePrioridad - a.puntajePrioridad || b.fechaRescate - a.fechaRescate
    );
  }

  async obtenerArchivados(): Promise<Caso[]> {
    await this.asegurarSemilla();
    const db = await getDatabase();
    const rows = await db.getAllAsync<CasoRow>(
      `${SQL_CASO_CON_REVISION} WHERE c.estado_caso IN ('ADOPTADO', 'FALLECIDO') ORDER BY c.updated_at DESC;`
    );
    return this.hidratarCasos(rows);
  }

  async obtenerTodos(): Promise<Caso[]> {
    await this.asegurarSemilla();
    const db = await getDatabase();
    const rows = await db.getAllAsync<CasoRow>(
      `${SQL_CASO_CON_REVISION} ORDER BY c.fecha_rescate DESC;`
    );
    return this.hidratarCasos(rows);
  }

  async obtenerPorId(id: string): Promise<Caso | undefined> {
    await this.asegurarSemilla();
    const db = await getDatabase();
    const row = await db.getFirstAsync<CasoRow>(
      `${SQL_CASO_CON_REVISION} WHERE c.id = ?;`,
      [id]
    );
    if (!row) return undefined;
    const [caso] = await this.hidratarCasos([row]);
    return caso;
  }

  async agregar(caso: Caso): Promise<Caso> {
    await this.asegurarCatalogosBase();
    const db = await getDatabase();
    const params = casoToParams(caso);

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

  private async obtenerUmbralActual(umbralExplicito?: number): Promise<number> {
    if (umbralExplicito != null) return umbralExplicito;
    try {
      const ajustes = await new AjustesRepositoryImpl().obtener();
      return ajustes.umbralUrgenteDias;
    } catch {
      return 15;
    }
  }

  async actualizar(caso: Caso): Promise<Caso> {
    const anterior = await this.obtenerPorId(caso.id);
    if (anterior && (anterior.estadoCaso === 'ADOPTADO' || anterior.estadoCaso === 'FALLECIDO') && caso.estadoCaso !== anterior.estadoCaso) {
      throw new Error(`El caso se encuentra cerrado (${anterior.estadoCaso}) y no admite modificaciones.`);
    }

    const db = await getDatabase();
    const ahora = Date.now();
    const umbralDias = await this.obtenerUmbralActual();
    const testsAnimal = caso.testsAnimal ?? (await this.obtenerResultadosTests(caso.id));
    const prioridad = calcularPrioridadCasoUseCase.ejecutar(
      {
        especie: caso.especie,
        estadoCaso: caso.estadoCaso,
        gravedadClinica: caso.gravedadClinica,
        vulnerabilidad: caso.vulnerabilidad,
        fechaRescate: caso.fechaRescate,
        fechaUltimaRevision: caso.fechaUltimaRevision,
        sanidad: caso.sanidad,
        testsAnimal,
      },
      umbralDias,
      ahora
    );

    const casoActualizado: Caso = {
      ...caso,
      testsAnimal,
      nivelPrioridad: prioridad.nivelPrioridad,
      motivoUrgencia: prioridad.motivoUrgencia,
      puntajePrioridad: prioridad.puntajePrioridad,
      esUrgente: prioridad.esUrgente,
      syncStatus: 'PENDING',
      updatedAt: ahora,
    };

    const params = casoToParams(casoActualizado, umbralDias);

    await db.runAsync(
      `UPDATE casos SET
        nombre_provisorio = $nombre_provisorio,
        cantidad_animales = $cantidad_animales,
        especie = $especie,
        especie_detalle = $especie_detalle,
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
        coordinador_id = $coordinador_id,
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
        creado_por_nombre = $creado_por_nombre,
        modificado_por_user_id = $modificado_por_user_id,
        es_urgente = $es_urgente,
        sync_status = $sync_status,
        updated_at = $updated_at
      WHERE id = $id;`,
      params
    );

    // Se encola el caso completo: el motor lo compara con la última versión conocida del servidor y
    // manda solo los campos que cambiaron (con nombres de columna que el servidor entiende).
    const changedFields = casoActualizado;

    const idempotencyKey = generarUUID();
    await db.runAsync(
      `INSERT INTO operaciones_pendientes (idempotency_key, entidad, operacion, payload, reintentos, created_at)
       VALUES (?, ?, ?, ?, 0, ?);`,
      [idempotencyKey, 'CASO', 'UPDATE', JSON.stringify(changedFields), ahora]
    );

    // La pantalla edita la ficha del grupo: se aplica a cada animal del caso y viaja como cambio propio.
    if (anterior && sanidadCambio(anterior.sanidad, casoActualizado.sanidad)) {
      await this.aplicarSanidadAAnimales(casoActualizado);
    }

    return casoActualizado;
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

    // La ficha del caso es el resumen del grupo: se recalcula sin tocar la de los demás animales.
    const caso = await this.obtenerPorId(animal.casoId);
    const resumen = resumenSanidad(await this.obtenerAnimales(animal.casoId));
    if (caso && resumen && sanidadCambio(caso.sanidad, resumen)) {
      const umbralDias = await this.obtenerUmbralActual();
      const prio = calcularPrioridadCasoUseCase.ejecutar(
        {
          especie: caso.especie,
          estadoCaso: caso.estadoCaso,
          gravedadClinica: caso.gravedadClinica,
          vulnerabilidad: caso.vulnerabilidad,
          fechaRescate: caso.fechaRescate,
          fechaUltimaRevision: caso.fechaUltimaRevision,
          sanidad: resumen,
          testsAnimal: caso.testsAnimal,
        },
        umbralDias,
        ahora
      );
      const conResumen: Caso = {
        ...caso,
        sanidad: resumen,
        nivelPrioridad: prio.nivelPrioridad,
        motivoUrgencia: prio.motivoUrgencia,
        puntajePrioridad: prio.puntajePrioridad,
        esUrgente: prio.esUrgente,
        syncStatus: 'PENDING',
        updatedAt: ahora,
      };
      await db.runAsync(
        `UPDATE casos SET castrado = $castrado, virales_vif_vilef = $virales,
           fecha_primera_desparasitacion = $d1, fecha_segunda_desparasitacion = $d2,
           nivel_prioridad = $nivel, motivo_urgencia = $motivo,
           puntaje_prioridad = $puntaje, es_urgente = $urgente,
           sync_status = 'PENDING', updated_at = $ahora WHERE id = $id;`,
        {
          $id: caso.id,
          $castrado: resumen.castrado,
          $virales: resumen.virales,
          $d1: resumen.fechaPrimeraDesparasitacion ?? null,
          $d2: resumen.fechaSegundaDesparasitacion ?? null,
          $nivel: prio.nivelPrioridad,
          $motivo: prio.motivoUrgencia,
          $puntaje: prio.puntajePrioridad,
          $urgente: prio.esUrgente ? 1 : 0,
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

  async actualizarEstado(
    id: string,
    nuevoEstado: EstadoCaso,
    motivo?: string,
    opciones?: OpcionesActualizacionEstado
  ): Promise<Caso> {
    const anterior = await this.obtenerPorId(id);
    if (!anterior) throw new Error('Caso no encontrado');
    if (anterior.estadoCaso === 'ADOPTADO' || anterior.estadoCaso === 'FALLECIDO') {
      throw new Error(`El caso ya está cerrado (${anterior.estadoCaso}) y no se puede modificar su estado.`);
    }

    const db = await getDatabase();
    const ahora = Date.now();
    const umbralDias = await this.obtenerUmbralActual(opciones?.umbralDias);

    const gravedadClinica = opciones?.gravedadClinica ?? anterior.gravedadClinica;
    const vulnerabilidad = opciones?.vulnerabilidad ?? anterior.vulnerabilidad;
    const destinoLimpio = opciones?.destino?.trim();
    const actualizaTransito =
      !!destinoLimpio &&
      (nuevoEstado === 'EN_TRANSITO' ||
        nuevoEstado === 'EN_CLINICA' ||
        nuevoEstado === 'PRE_ADOPTADO' ||
        nuevoEstado === 'ADOPTADO');
    const transitoNombre = actualizaTransito ? destinoLimpio : anterior.transito.nombre || null;

    const prioridad = calcularPrioridadCasoUseCase.ejecutar(
      {
        especie: anterior.especie,
        estadoCaso: nuevoEstado,
        gravedadClinica,
        vulnerabilidad,
        fechaRescate: anterior.fechaRescate,
        fechaUltimaRevision: anterior.fechaUltimaRevision,
        sanidad: anterior.sanidad,
        testsAnimal: anterior.testsAnimal,
      },
      umbralDias,
      ahora
    );

    await db.runAsync(
      `UPDATE casos SET
        estado_caso = $estado_caso,
        gravedad_clinica = $gravedad_clinica,
        vulnerabilidad = $vulnerabilidad,
        nivel_prioridad = $nivel_prioridad,
        motivo_urgencia = $motivo_urgencia,
        puntaje_prioridad = $puntaje_prioridad,
        es_urgente = $es_urgente,
        transito_nombre = $transito_nombre,
        sync_status = $sync_status,
        updated_at = $updated_at
      WHERE id = $id;`,
      {
        $id: id,
        $estado_caso: nuevoEstado,
        $gravedad_clinica: gravedadClinica,
        $vulnerabilidad: vulnerabilidad,
        $nivel_prioridad: prioridad.nivelPrioridad,
        $motivo_urgencia: prioridad.motivoUrgencia,
        $puntaje_prioridad: prioridad.puntajePrioridad,
        $es_urgente: prioridad.esUrgente ? 1 : 0,
        $transito_nombre: transitoNombre,
        $sync_status: 'PENDING',
        $updated_at: ahora,
      }
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

    const deltaPayload: Record<string, any> = {
      id,
      estado_caso: nuevoEstado,
      gravedad_clinica: gravedadClinica,
      vulnerabilidad,
      nivel_prioridad: prioridad.nivelPrioridad,
      motivo_urgencia: prioridad.motivoUrgencia,
      puntaje_prioridad: prioridad.puntajePrioridad,
      updated_at: ahora,
    };
    if (actualizaTransito) {
      deltaPayload.transito_nombre = transitoNombre;
    }

    const idempotencyKey = generarUUID();
    await db.runAsync(
      `INSERT INTO operaciones_pendientes (idempotency_key, entidad, operacion, payload, reintentos, created_at)
       VALUES (?, ?, ?, ?, 0, ?);`,
      [idempotencyKey, 'CASO', 'UPDATE', JSON.stringify(deltaPayload), ahora]
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

    return {
      ...anterior,
      estadoCaso: nuevoEstado,
      gravedadClinica,
      vulnerabilidad,
      nivelPrioridad: prioridad.nivelPrioridad,
      motivoUrgencia: prioridad.motivoUrgencia,
      puntajePrioridad: prioridad.puntajePrioridad,
      esUrgente: prioridad.esUrgente,
      transito: {
        ...anterior.transito,
        nombre: transitoNombre ?? '',
      },
      syncStatus: 'PENDING',
      updatedAt: ahora,
    };
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

  async obtenerCoordinadores(): Promise<Coordinador[]> {
    await this.asegurarCatalogosBase();
    const db = await getDatabase();
    const rows = await db.getAllAsync<CoordinadorRow>(
      'SELECT * FROM coordinadores WHERE activo = 1 ORDER BY nombre ASC;'
    );
    return rows.length > 0 ? rows.map(coordinadorFromRow) : COORDINADORES_FIJOS;
  }

  async obtenerCatalogoTests(especie?: Especie): Promise<TestViralFijo[]> {
    await this.asegurarCatalogosBase();
    const db = await getDatabase();
    const rows = await db.getAllAsync<TestViralRow>(
      'SELECT * FROM tests_virales WHERE activo = 1 ORDER BY orden ASC;'
    );
    const lista = rows.length > 0 ? rows.map(testViralFromRow) : TESTS_VIRALES_FIJOS;
    return especie ? lista.filter((t) => t.especie === especie) : lista;
  }

  async obtenerResultadosTests(casoId: string): Promise<RegistroTestAnimal[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ResultadoTestAnimalRow>(
      'SELECT * FROM resultados_tests_animal WHERE caso_id = ?;',
      [casoId]
    );
    return rows.map(resultadoTestFromRow);
  }

  async guardarResultadoTest(registro: RegistroTestAnimal): Promise<RegistroTestAnimal> {
    await this.asegurarCatalogosBase();
    const db = await getDatabase();
    const ahora = Date.now();

    // Reutilizar ID existente para (caso_id, animal_id, test_id) sin duplicar filas en SQLite/WebDB
    const existentes = await this.obtenerResultadosTests(registro.casoId);
    const previo = existentes.find((t) =>
      registro.animalId
        ? t.animalId === registro.animalId && t.testId === registro.testId
        : !t.animalId && t.testId === registro.testId
    );

    const guardado: RegistroTestAnimal = {
      ...registro,
      id: previo?.id || registro.id || generarUUID(),
      updatedAt: ahora,
    };

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
         sync_status = 'PENDING',
         updated_at = excluded.updated_at;`,
      resultadoTestToParams(guardado, 'PENDING')
    );

    await db.runAsync(
      `INSERT INTO operaciones_pendientes (idempotency_key, entidad, operacion, payload, reintentos, created_at)
       VALUES (?, ?, ?, ?, 0, ?);`,
      [generarUUID(), 'TEST_ANIMAL', 'UPDATE', JSON.stringify(guardado), ahora]
    );

    // Recalcular resumen viral (en gatos) y prioridad del caso asociado
    const caso = await this.obtenerPorId(guardado.casoId);
    if (caso) {
      const todosTests = await this.obtenerResultadosTests(caso.id);
      let viralesCaso = caso.sanidad.virales;
      if (caso.especie === 'Gato') {
        const vif = todosTests.find((t) => t.testId === 'vif')?.resultado;
        const vilef = todosTests.find((t) => t.testId === 'vilef')?.resultado;
        if (vif === 'POSITIVO' && vilef === 'POSITIVO') viralesCaso = 'AMBOS_POSITIVOS';
        else if (vilef === 'POSITIVO') viralesCaso = 'VILEF_POSITIVO';
        else if (vif === 'POSITIVO') viralesCaso = 'VIF_POSITIVO';
        else if (vif && vilef && vif !== 'PENDIENTE' && vilef !== 'PENDIENTE') viralesCaso = 'NEGATIVO';
        else if (vif === 'PENDIENTE' || vilef === 'PENDIENTE') viralesCaso = 'PENDIENTE';
      }

      const umbralDias = await this.obtenerUmbralActual();
      const prio = calcularPrioridadCasoUseCase.ejecutar(
        {
          especie: caso.especie,
          estadoCaso: caso.estadoCaso,
          gravedadClinica: caso.gravedadClinica,
          vulnerabilidad: caso.vulnerabilidad,
          fechaRescate: caso.fechaRescate,
          fechaUltimaRevision: caso.fechaUltimaRevision,
          sanidad: { ...caso.sanidad, virales: viralesCaso },
          testsAnimal: todosTests,
        },
        umbralDias,
        ahora
      );

      await db.runAsync(
        `UPDATE casos SET virales_vif_vilef = $virales, nivel_prioridad = $nivel, motivo_urgencia = $motivo,
            puntaje_prioridad = $puntaje, es_urgente = $urgente, sync_status = 'PENDING', updated_at = $ahora
         WHERE id = $id;`,
        {
          $id: caso.id,
          $virales: viralesCaso,
          $nivel: prio.nivelPrioridad,
          $motivo: prio.motivoUrgencia,
          $puntaje: prio.puntajePrioridad,
          $urgente: prio.esUrgente ? 1 : 0,
          $ahora: ahora,
        }
      );

      const actualizado: Caso = {
        ...caso,
        sanidad: { ...caso.sanidad, virales: viralesCaso },
        testsAnimal: todosTests,
        nivelPrioridad: prio.nivelPrioridad,
        motivoUrgencia: prio.motivoUrgencia,
        puntajePrioridad: prio.puntajePrioridad,
        esUrgente: prio.esUrgente,
        updatedAt: ahora,
      };
      await db.runAsync(
        `INSERT INTO operaciones_pendientes (idempotency_key, entidad, operacion, payload, reintentos, created_at)
         VALUES (?, ?, ?, ?, 0, ?);`,
        [generarUUID(), 'CASO', 'UPDATE', JSON.stringify(actualizado), ahora]
      );
    }

    return guardado;
  }

  async obtenerRelaciones(casoId: string): Promise<RelacionAnimal[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<RelacionAnimalRow>(
      'SELECT * FROM relaciones_animales WHERE caso_origen_id = ? OR caso_destino_id = ?;',
      [casoId, casoId]
    );
    return rows.map(relacionFromRow);
  }

  async guardarRelacion(relacion: RelacionAnimal): Promise<RelacionAnimal> {
    const db = await getDatabase();
    const ahora = Date.now();
    const guardado: RelacionAnimal = {
      ...relacion,
      id: relacion.id || generarUUID(),
      updatedAt: ahora,
    };

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
         sync_status = 'PENDING',
         updated_at = excluded.updated_at;`,
      relacionToParams(guardado, 'PENDING')
    );

    await db.runAsync(
      `INSERT INTO operaciones_pendientes (idempotency_key, entidad, operacion, payload, reintentos, created_at)
       VALUES (?, ?, ?, ?, 0, ?);`,
      [generarUUID(), 'RELACION', 'CREATE', JSON.stringify(guardado), ahora]
    );

    return guardado;
  }

  async eliminarRelacion(relacionId: string): Promise<void> {
    const db = await getDatabase();
    const ahora = Date.now();
    await db.runAsync('DELETE FROM relaciones_animales WHERE id = ?;', [relacionId]);
    await db.runAsync(
      `INSERT INTO operaciones_pendientes (idempotency_key, entidad, operacion, payload, reintentos, created_at)
       VALUES (?, ?, ?, ?, 0, ?);`,
      [generarUUID(), 'RELACION', 'DELETE', JSON.stringify({ id: relacionId }), ahora]
    );
  }
}
