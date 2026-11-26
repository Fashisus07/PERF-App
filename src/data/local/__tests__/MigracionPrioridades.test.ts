import { BaseDatosMigracion, MIGRACION_PRIORIDADES_ID, recalcularPrioridadesLocales } from '../MigracionPrioridades';
import type { CasoRow, EventoHistorialRow, ResultadoTestAnimalRow } from '../../mappers/CasoMapper';

function crearDbMemoria(inicial: {
  casos: Partial<CasoRow>[];
  tests?: ResultadoTestAnimalRow[];
  eventos?: EventoHistorialRow[];
  migraciones?: { id: string; ejecutada_at: number }[];
}) {
  const casos = inicial.casos.map((c) => ({ ...c })) as CasoRow[];
  const tests = inicial.tests ?? [];
  const eventos = inicial.eventos ?? [];
  const migraciones = [...(inicial.migraciones ?? [])];

  const db: BaseDatosMigracion = {
    async execAsync() {},
    async getFirstAsync<T>(sql: string, params: any[]): Promise<T | null> {
      if (/from\s+meta_migraciones/i.test(sql)) {
        const hit = migraciones.find((m) => m.id === params?.[0]);
        return (hit ?? null) as unknown as T | null;
      }
      return null;
    },
    async getAllAsync<T>(sql: string): Promise<T[]> {
      if (/from\s+casos/i.test(sql)) return casos as unknown as T[];
      if (/from\s+resultados_tests_animal/i.test(sql)) return tests as unknown as T[];
      if (/from\s+eventos_historial/i.test(sql)) return eventos as unknown as T[];
      return [];
    },
    async runAsync(sql: string, params: any[]) {
      if (/update\s+casos/i.test(sql) && params) {
        const [nivel, motivo, puntaje, esUrgente, id] = params;
        const fila = casos.find((c) => c.id === id);
        if (fila) {
          fila.nivel_prioridad = nivel;
          fila.motivo_urgencia = motivo;
          fila.puntaje_prioridad = puntaje;
          fila.es_urgente = esUrgente;
        }
      } else if (/insert\s+or\s+ignore\s+into\s+meta_migraciones/i.test(sql) && params) {
        const [id, ejecutada_at] = params;
        if (!migraciones.some((m) => m.id === id)) {
          migraciones.push({ id, ejecutada_at });
        }
      }
    },
  };

  return { db, casos, migraciones };
}

describe('MigracionPrioridades (instalaciones viejas)', () => {
  const ahora = new Date(2026, 10, 26, 12, 0, 0).getTime();
  const diaMs = 24 * 60 * 60 * 1000;

  test('recalcula columnas obsoletas usando gravedad, tests por especie y última revisión, una sola vez', async () => {
    const { db, casos, migraciones } = crearDbMemoria({
      casos: [
        {
          id: 'c-perro-parvo',
          nombre_provisorio: 'Rocky',
          especie: 'Perro',
          estado_caso: 'EN_TRANSITO',
          gravedad_clinica: 'MODERADA',
          vulnerabilidad: 'ESTABLE',
          fecha_rescate: ahora - 3 * diaMs,
          castrado: 'PENDIENTE',
          virales_vif_vilef: 'PENDIENTE',
          // Valores viejos obsoletos de versiones anteriores:
          nivel_prioridad: 'AL_DIA',
          motivo_urgencia: 'Desactualizado',
          puntaje_prioridad: 0,
          es_urgente: 0,
          sync_status: 'SYNCED',
          updated_at: 1000,
        },
        {
          id: 'c-gato-al-dia',
          nombre_provisorio: 'Mishi',
          especie: 'Gato',
          estado_caso: 'EN_TRANSITO',
          gravedad_clinica: 'SANA',
          vulnerabilidad: 'ESTABLE',
          fecha_rescate: ahora - 25 * diaMs,
          castrado: 'SI',
          virales_vif_vilef: 'NEGATIVO',
          fecha_primera_desparasitacion: ahora - 3 * diaMs,
          fecha_segunda_desparasitacion: ahora - 1 * diaMs,
          nivel_prioridad: 'URGENTE',
          motivo_urgencia: '+25 días sin revisión',
          puntaje_prioridad: 800,
          es_urgente: 1,
          sync_status: 'SYNCED',
          updated_at: 1000,
        },
      ],
      tests: [
        {
          id: 'r1',
          caso_id: 'c-perro-parvo',
          animal_id: null,
          test_id: 'parvo',
          resultado: 'POSITIVO',
          fecha_test: ahora,
          observaciones: null,
          registrado_por: null,
          sync_status: 'SYNCED',
          updated_at: 1000,
        },
      ],
      eventos: [
        // Revisión reciente hace 2 días: saca a c-gato-al-dia de +25 días!
        {
          id: 'e1',
          caso_id: 'c-gato-al-dia',
          tipo: 'VISITA_VET',
          fecha: ahora - 2 * diaMs,
          descripcion: 'Control ok',
          sync_status: 'SYNCED',
        },
      ],
    });

    const primera = await recalcularPrioridadesLocales(db, 15, ahora);
    expect(primera).toEqual({ ejecutada: true, actualizados: 2 });

    expect(casos[0].nivel_prioridad).toBe('URGENTE');
    expect(casos[0].es_urgente).toBe(1);
    expect(casos[0].sync_status).toBe('SYNCED');
    expect(casos[0].updated_at).toBe(1000);

    expect(casos[1].nivel_prioridad).toBe('AL_DIA');
    expect(casos[1].es_urgente).toBe(0);
    expect(migraciones.some((m) => m.id === MIGRACION_PRIORIDADES_ID)).toBe(true);

    // Segunda corrida es idempotente y no vuelve a procesar.
    const segunda = await recalcularPrioridadesLocales(db, 15, ahora);
    expect(segunda).toEqual({ ejecutada: false, actualizados: 0 });
  });
});
