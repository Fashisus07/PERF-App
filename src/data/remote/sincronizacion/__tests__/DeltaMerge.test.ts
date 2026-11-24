import { diferenciasCaso, camposComparables } from '../mapeo';
import { Caso } from '../../../../domain/models/Caso';

describe('Delta Merge / Fusión Campo a Campo sin Pérdida de Datos', () => {
  const casoBase: Caso = {
    id: 'caso-uuid-1',
    nombreProvisorio: 'Misho',
    cantidadAnimales: 1,
    especie: 'Gato',
    edadEstimada: '1 año',
    historiaOrigen: 'Rescate en plaza',
    personalidad: 'Cariñoso',
    estadoVisible: 'Estable',
    barrio: 'Caballito',
    coordenadas: null,
    fotoUri: null,
    fotoLocalUri: null,
    fotoRemotePath: null,
    fotoSyncStatus: 'SYNCED',
    fechaRescate: 1700000000000,
    quienSigueCaso: 'Cami',
    transito: {
      nombre: 'Lucía',
      telefono: '1122334455',
    },
    sanidad: {
      castrado: 'PENDIENTE',
      virales: 'PENDIENTE',
    },
    estadoCaso: 'EN_TRANSITO',
    gravedadClinica: 'MODERADA',
    vulnerabilidad: 'ESTABLE',
    nivelPrioridad: 'ATENCION',
    motivoUrgencia: 'ATENCIÓN • Moderado',
    puntajePrioridad: 500,
    esUrgente: false,
    syncStatus: 'SYNCED',
    updatedAt: 1700000000000,
  };

  test('diferenciasCaso detecta únicamente los campos modificados en la edición', () => {
    const baseComparable = camposComparables(casoBase);
    const ahora = 1700001000000;

    // Voluntario A solo cambia el nombre del tránsito
    const payload = {
      id: casoBase.id,
      transito_nombre: 'Mariana Gómez',
      updated_at: ahora,
    };

    const dif = diferenciasCaso(payload, baseComparable, ahora);

    expect(Object.keys(dif.cambios)).toEqual(['transito_nombre']);
    expect(dif.cambios.transito_nombre).toBe('Mariana Gómez');
    expect(dif.camposTs.transito_nombre).toBe(ahora);
  });

  test('Fusión de dos voluntarios en campos distintos (Voluntario A: tránsito, Voluntario B: gravedad)', () => {
    const baseComparable = camposComparables(casoBase);
    const tiempoA = 1700001000000;
    const tiempoB = 1700002000000;

    // Mutación A: tránsito
    const mutacionA = diferenciasCaso(
      { id: casoBase.id, transito_nombre: 'Mariana Gómez', transito_telefono: '99887766' },
      baseComparable,
      tiempoA
    );

    // Mutación B: gravedad clínica
    const mutacionB = diferenciasCaso(
      { id: casoBase.id, gravedad_clinica: 'CRITICA', nivel_prioridad: 'URGENTE' },
      baseComparable,
      tiempoB
    );

    // Simular aplicación de cambios en el estado combinado
    const estadoFusionado = { ...baseComparable, ...mutacionA.nuevosValores, ...mutacionB.nuevosValores };

    expect(estadoFusionado.transito_nombre).toBe('Mariana Gómez');
    expect(estadoFusionado.transito_telefono).toBe('99887766');
    expect(estadoFusionado.gravedad_clinica).toBe('CRITICA');
    expect(estadoFusionado.nivel_prioridad).toBe('URGENTE');
    expect(estadoFusionado.nombre_provisorio).toBe('Misho'); // Campo no tocado se mantiene intacto
  });

  test('Si no hay cambios respecto a la base, diferenciasCaso devuelve objeto vacío', () => {
    const baseComparable = camposComparables(casoBase);
    const dif = diferenciasCaso(casoBase, baseComparable, Date.now());

    expect(Object.keys(dif.cambios)).toHaveLength(0);
  });
});
