import {
  Especie,
  EstadoCastracion,
  EstadoVirales,
  EVENTOS_QUE_NO_SON_REVISION,
  GravedadClinica,
  RegistroTestAnimal,
  TipoEvento,
  Vulnerabilidad,
} from '../../domain/models/Caso';
import { calcularPrioridadCasoUseCase } from '../../domain/usecases/CalcularPrioridadCasoUseCase';
import {
  CasoRow,
  EventoHistorialRow,
  ResultadoTestAnimalRow,
  resultadoTestFromRow,
} from '../mappers/CasoMapper';
import { AjustesRepositoryImpl } from './AjustesRepositoryImpl';

export const MIGRACION_PRIORIDADES_ID = 'prioridades_multicriterio_v1';

export interface BaseDatosMigracion {
  execAsync(sql: string): Promise<void>;
  getFirstAsync<T>(sql: string, params: any[]): Promise<T | null>;
  getAllAsync<T>(sql: string): Promise<T[]>;
  runAsync(sql: string, params: any[]): Promise<unknown>;
}

const NO_ES_REVISION = new Set<string>(EVENTOS_QUE_NO_SON_REVISION);

async function leerUmbralSeguro(): Promise<number> {
  try {
    const ajustes = await new AjustesRepositoryImpl().obtener();
    return ajustes.umbralUrgenteDias;
  } catch {
    return 15;
  }
}

/**
 * Recalcula una sola vez las columnas de prioridad guardadas en SQLite (`nivel_prioridad`,
 * `motivo_urgencia`, `puntaje_prioridad`, `es_urgente`) para dispositivos actualizados desde
 * versiones anteriores al triaje multicriterio. No altera `sync_status` ni `updated_at`.
 */
export async function recalcularPrioridadesLocales(
  db: BaseDatosMigracion,
  umbralExplicito?: number,
  ahora = Date.now(),
): Promise<{ ejecutada: boolean; actualizados: number }> {
  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS meta_migraciones (id TEXT PRIMARY KEY NOT NULL, ejecutada_at INTEGER NOT NULL);',
  );

  const yaEjecutada = await db.getFirstAsync<{ id: string }>(
    'SELECT * FROM meta_migraciones WHERE id = ?;',
    [MIGRACION_PRIORIDADES_ID],
  );
  if (yaEjecutada) {
    return { ejecutada: false, actualizados: 0 };
  }

  const umbral = umbralExplicito ?? (await leerUmbralSeguro());
  const casos = await db.getAllAsync<CasoRow>('SELECT * FROM casos;');

  let testsRows: ResultadoTestAnimalRow[] = [];
  try {
    testsRows = await db.getAllAsync<ResultadoTestAnimalRow>('SELECT * FROM resultados_tests_animal;');
  } catch {
    testsRows = [];
  }

  let eventosRows: EventoHistorialRow[] = [];
  try {
    eventosRows = await db.getAllAsync<EventoHistorialRow>('SELECT * FROM eventos_historial;');
  } catch {
    eventosRows = [];
  }

  const testsPorCaso = new Map<string, RegistroTestAnimal[]>();
  for (const tr of testsRows) {
    const lista = testsPorCaso.get(tr.caso_id) ?? [];
    lista.push(resultadoTestFromRow(tr));
    testsPorCaso.set(tr.caso_id, lista);
  }

  const ultimaRevisionPorCaso = new Map<string, number>();
  for (const ev of eventosRows) {
    if (NO_ES_REVISION.has(ev.tipo as TipoEvento)) continue;
    const prev = ultimaRevisionPorCaso.get(ev.caso_id);
    if (prev == null || ev.fecha > prev) {
      ultimaRevisionPorCaso.set(ev.caso_id, ev.fecha);
    }
  }

  let actualizados = 0;
  for (const row of casos) {
    const especie = (row.especie as Especie) || 'Gato';
    const gravedad = (row.gravedad_clinica as GravedadClinica) || (row.es_urgente === 1 ? 'CRITICA' : 'MODERADA');
    const vulnerabilidad = (row.vulnerabilidad as Vulnerabilidad) || 'ESTABLE';
    const sanidad = {
      castrado: (row.castrado as EstadoCastracion) || 'PENDIENTE',
      virales: (row.virales_vif_vilef as EstadoVirales) || 'PENDIENTE',
      fechaPrimeraDesparasitacion: row.fecha_primera_desparasitacion,
      fechaSegundaDesparasitacion: row.fecha_segunda_desparasitacion,
    };

    const calculo = calcularPrioridadCasoUseCase.ejecutar(
      {
        especie,
        estadoCaso: row.estado_caso,
        gravedadClinica: gravedad,
        vulnerabilidad,
        fechaRescate: row.fecha_rescate,
        fechaUltimaRevision: row.ultima_revision ?? ultimaRevisionPorCaso.get(row.id) ?? null,
        sanidad,
        testsAnimal: testsPorCaso.get(row.id),
      },
      umbral,
      ahora,
    );

    const urgenteInt = calculo.esUrgente ? 1 : 0;
    const cambio =
      row.nivel_prioridad !== calculo.nivelPrioridad ||
      (row.motivo_urgencia ?? null) !== calculo.motivoUrgencia ||
      Number(row.puntaje_prioridad ?? -1) !== calculo.puntajePrioridad ||
      Number(row.es_urgente ?? -1) !== urgenteInt;

    if (cambio) {
      await db.runAsync(
        'UPDATE casos SET nivel_prioridad = ?, motivo_urgencia = ?, puntaje_prioridad = ?, es_urgente = ? WHERE id = ?;',
        [calculo.nivelPrioridad, calculo.motivoUrgencia, calculo.puntajePrioridad, urgenteInt, row.id],
      );
      actualizados++;
    }
  }

  await db.runAsync(
    'INSERT OR IGNORE INTO meta_migraciones (id, ejecutada_at) VALUES (?, ?);',
    [MIGRACION_PRIORIDADES_ID, ahora],
  );

  return { ejecutada: true, actualizados };
}
