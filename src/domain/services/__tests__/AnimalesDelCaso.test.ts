import { Caso } from '../../models/Caso';
import { camposComparables, diferenciasCaso } from '../../../data/remote/sincronizacion/mapeo';
import { AnimalCaso } from '../../models/Animal';
import { conSanidadDelGrupo, crearAnimalesDelCaso, resumenSanidad, sanidadCambio } from '../AnimalesDelCaso';

const caso = (cantidad: number): Caso => ({
  id: 'c1',
  nombreProvisorio: 'Misho',
  cantidadAnimales: cantidad,
  especie: 'Gato',
  edadEstimada: '',
  historiaOrigen: '',
  personalidad: '',
  estadoVisible: '',
  barrio: 'Almagro',
  coordenadas: null,
  fechaRescate: 1,
  quienSigueCaso: '',
  transito: { nombre: '', telefono: '' },
  sanidad: { castrado: 'SI', virales: 'NEGATIVO', fechaPrimeraDesparasitacion: 1000 },
  estadoCaso: 'EN_TRANSITO',
  gravedadClinica: 'MODERADA',
  vulnerabilidad: 'ESTABLE',
  nivelPrioridad: 'ATENCION',
  motivoUrgencia: '',
  puntajePrioridad: 0,
  esUrgente: false,
  syncStatus: 'PENDING',
  updatedAt: 1,
});

describe('Animales de un caso', () => {
  test('un caso de un animal crea uno con el nombre del caso y la sanidad del grupo', () => {
    let n = 0;
    const animales = crearAnimalesDelCaso(caso(1), () => `id-${++n}`);
    expect(animales).toHaveLength(1);
    expect(animales[0]).toMatchObject({ id: 'id-1', casoId: 'c1', nombre: 'Misho', castrado: 'SI', virales: 'NEGATIVO', fechaPrimeraDesparasitacion: 1000, syncStatus: 'PENDING' });
  });

  test('una camada crea un animal numerado por cada integrante, con ids distintos', () => {
    let n = 0;
    const animales = crearAnimalesDelCaso(caso(3), () => `id-${++n}`);
    expect(animales.map((a) => a.nombre)).toEqual(['Misho 1', 'Misho 2', 'Misho 3']);
    expect(new Set(animales.map((a) => a.id)).size).toBe(3);
  });

  test('un caso sin cantidad valida igual crea un animal', () => {
    expect(crearAnimalesDelCaso(caso(0), () => 'x')).toHaveLength(1);
  });

  test('aplicar la sanidad del grupo no pisa los datos propios del animal', () => {
    const [a] = crearAnimalesDelCaso(caso(1), () => 'x');
    const propio = { ...a, nombre: 'Misho chico', embarazada: true, pesoGramos: 900 };
    const nuevo = conSanidadDelGrupo(propio, { castrado: 'NO', virales: 'VIF_POSITIVO' }, 5);
    expect(nuevo).toMatchObject({ nombre: 'Misho chico', embarazada: true, pesoGramos: 900, castrado: 'NO', virales: 'VIF_POSITIVO', fechaPrimeraDesparasitacion: null, updatedAt: 5 });
  });

  test('sanidadCambio detecta cambios y trata undefined y null como lo mismo', () => {
    expect(sanidadCambio({ castrado: 'SI', virales: 'NEGATIVO' }, { castrado: 'SI', virales: 'NEGATIVO', fechaPrimeraDesparasitacion: null })).toBe(false);
    expect(sanidadCambio({ castrado: 'SI', virales: 'NEGATIVO' }, { castrado: 'NO', virales: 'NEGATIVO' })).toBe(true);
  });

  describe('resumen de sanidad del grupo', () => {
    const base = (id: string, extra: Partial<AnimalCaso> = {}): AnimalCaso => ({
      id,
      casoId: 'c1',
      nombre: id,
      castrado: 'SI',
      virales: 'NEGATIVO',
      embarazada: false,
      fechaPrimeraDesparasitacion: 100,
      fechaSegundaDesparasitacion: 200,
      fallecido: false,
      syncStatus: 'SYNCED',
      updatedAt: 1,
      ...extra,
    });

    test('sin animales no hay resumen', () => {
      expect(resumenSanidad([])).toBeNull();
    });

    test('si todos estan castrados y negativos, el grupo tambien', () => {
      expect(resumenSanidad([base('a'), base('b')])).toMatchObject({ castrado: 'SI', virales: 'NEGATIVO' });
    });

    test('un solo animal pendiente deja el grupo pendiente', () => {
      expect(resumenSanidad([base('a'), base('b', { castrado: 'PENDIENTE' })])?.castrado).toBe('PENDIENTE');
    });

    test('un positivo cuenta para todo el grupo, y VIF + ViLeF en animales distintos dan ambos', () => {
      expect(resumenSanidad([base('a'), base('b', { virales: 'VIF_POSITIVO' })])?.virales).toBe('VIF_POSITIVO');
      expect(resumenSanidad([base('a', { virales: 'VIF_POSITIVO' }), base('b', { virales: 'VILEF_POSITIVO' })])?.virales).toBe('AMBOS_POSITIVOS');
    });

    test('la desparasitacion solo cuenta si la tienen todos, con la fecha mas antigua', () => {
      const r = resumenSanidad([base('a', { fechaPrimeraDesparasitacion: 300 }), base('b', { fechaPrimeraDesparasitacion: 100 })]);
      expect(r?.fechaPrimeraDesparasitacion).toBe(100);
      expect(resumenSanidad([base('a'), base('b', { fechaSegundaDesparasitacion: null })])?.fechaSegundaDesparasitacion).toBeNull();
    });

    test('un animal fallecido no cuenta, salvo que todos lo esten', () => {
      expect(resumenSanidad([base('a'), base('b', { castrado: 'PENDIENTE', fallecido: true })])?.castrado).toBe('SI');
      expect(resumenSanidad([base('b', { castrado: 'PENDIENTE', fallecido: true })])?.castrado).toBe('PENDIENTE');
    });
  });

  test('editar la sanidad de un caso llega al servidor con nombres de columna (antes se perdia)', () => {
    const original = caso(1);
    const editado: Caso = { ...original, sanidad: { ...original.sanidad, castrado: 'NO' }, estadoVisible: 'Cojea' };
    const dif = diferenciasCaso(editado, camposComparables(original), 5);
    expect(dif.cambios).toEqual({ castrado: 'NO', estado_visible: 'Cojea' });
  });
});
