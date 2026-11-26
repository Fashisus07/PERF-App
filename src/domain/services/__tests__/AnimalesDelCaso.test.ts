import { Caso } from '../../models/Caso';
import { conSanidadDelGrupo, crearAnimalesDelCaso, sanidadCambio } from '../AnimalesDelCaso';

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
});
