import { Caso } from '../../models/Caso';
import { filtrarYOrdenarCasos, OpcionesFiltradoCasos } from '../FiltrarCasos';

const AHORA = Date.now();
const DIA = 24 * 60 * 60 * 1000;

function hacerCaso(parcial: Partial<Caso>): Caso {
  return {
    id: parcial.id ?? 'caso-1',
    nombreProvisorio: parcial.nombreProvisorio ?? 'Michi',
    cantidadAnimales: 1,
    especie: parcial.especie ?? 'Gato',
    especieDetalle: parcial.especieDetalle ?? null,
    edadEstimada: '1 año',
    historiaOrigen: 'Rescate en calle',
    personalidad: 'Tranquilo',
    estadoVisible: 'Estable',
    barrio: parcial.barrio ?? 'Caballito',
    coordenadas: null,
    fotoUri: null,
    fotoLocalUri: null,
    fotoRemotePath: null,
    fotoSyncStatus: 'SYNCED',
    fechaRescate: parcial.fechaRescate ?? AHORA - 2 * DIA,
    fechaUltimaRevision: parcial.fechaUltimaRevision ?? null,
    quienSigueCaso: parcial.quienSigueCaso ?? 'Cami',
    coordinadorId: parcial.coordinadorId ?? 'coord-cami',
    coordinadorPerfilId: parcial.coordinadorPerfilId ?? null,
    transito: { nombre: 'Ana', telefono: '1122334455' },
    sanidad: parcial.sanidad ?? {
      castrado: 'SI',
      virales: 'NEGATIVO',
      fechaPrimeraDesparasitacion: AHORA - DIA,
      fechaSegundaDesparasitacion: AHORA,
    },
    testsAnimal: parcial.testsAnimal,
    relaciones: parcial.relaciones,
    estadoCaso: parcial.estadoCaso ?? 'EN_TRANSITO',
    gravedadClinica: parcial.gravedadClinica ?? 'SANA',
    vulnerabilidad: parcial.vulnerabilidad ?? 'ESTABLE',
    nivelPrioridad: 'AL_DIA',
    motivoUrgencia: 'Al día',
    puntajePrioridad: 100,
    creadoPorNombre: parcial.creadoPorNombre ?? null,
    esUrgente: false,
    syncStatus: 'SYNCED',
    updatedAt: parcial.updatedAt ?? AHORA - DIA,
  };
}

const opcionesBase = (extra: Partial<OpcionesFiltradoCasos> = {}): OpcionesFiltradoCasos => ({
  busqueda: '',
  filtroUrgencia: 'todos',
  soloMios: false,
  estadoFiltro: 'todos',
  orden: 'prioridad',
  umbralDias: 15,
  voluntario: null,
  ...extra,
});

describe('FiltrarCasos (filtros, orden y "Mis casos")', () => {
  const casos: Caso[] = [
    hacerCaso({
      id: 'c1',
      nombreProvisorio: 'Nube',
      barrio: 'Almagro',
      quienSigueCaso: 'Cami',
      coordinadorPerfilId: 'user-cami',
      gravedadClinica: 'CRITICA',
      estadoCaso: 'EN_CLINICA',
      fechaRescate: AHORA - 5 * DIA,
      fechaUltimaRevision: AHORA - 1 * DIA,
      creadoPorNombre: 'Sofía López',
    }),
    hacerCaso({
      id: 'c2',
      nombreProvisorio: 'Pomelo',
      especie: 'Otro',
      especieDetalle: 'Conejo',
      barrio: 'Caballito',
      quienSigueCaso: 'Juli',
      coordinadorPerfilId: 'user-juli',
      gravedadClinica: 'MODERADA',
      estadoCaso: 'EN_TRANSITO',
      fechaRescate: AHORA - 1 * DIA,
      fechaUltimaRevision: AHORA - 3 * DIA,
      creadoPorNombre: 'Lucas Martín',
    }),
    hacerCaso({
      id: 'c3',
      nombreProvisorio: 'Coco',
      especie: 'Perro',
      barrio: 'Palermo',
      quienSigueCaso: 'Camila Pérez',
      coordinadorPerfilId: null,
      gravedadClinica: 'SANA',
      estadoCaso: 'EN_ADOPCION',
      fechaRescate: AHORA - 8 * DIA,
      fechaUltimaRevision: AHORA,
      relaciones: [
        {
          id: 'rel-1',
          casoOrigenId: 'c3',
          tipoRelacion: 'HIJO_DE',
          casoDestinoId: 'mora-id',
          nombreDestino: 'Mora',
          updatedAt: AHORA,
        },
      ],
    }),
  ];

  test('Mis casos coincide por coordinadorPerfilId y por coincidencia de nombre', () => {
    const res = filtrarYOrdenarCasos(
      casos,
      opcionesBase({
        soloMios: true,
        voluntario: { id: 'user-cami', nombre: 'Camila Pérez' },
      })
    );
    expect(res.cantidadMios).toBe(2);
    expect(res.visibles.map((c) => c.id)).toEqual(['c1', 'c3']);
  });

  test('filtra por estado operativo y calcula conteos por urgencia', () => {
    const res = filtrarYOrdenarCasos(
      casos,
      opcionesBase({ estadoFiltro: 'EN_TRANSITO' })
    );
    expect(res.conteo).toEqual({ todos: 1, urgente: 0, atencion: 1, aldia: 0 });
    expect(res.visibles.map((c) => c.id)).toEqual(['c2']);
    expect(res.estadosDisponibles).toEqual(['EN_CLINICA', 'EN_TRANSITO', 'EN_ADOPCION']);
  });

  test('filtra por urgencia y busca por nombre, barrio, especieDetalle o autor', () => {
    const urgente = filtrarYOrdenarCasos(casos, opcionesBase({ filtroUrgencia: 'urgente' }));
    expect(urgente.visibles.map((c) => c.id)).toEqual(['c1']);

    const porEspecieDetalle = filtrarYOrdenarCasos(casos, opcionesBase({ busqueda: 'conejo' }));
    expect(porEspecieDetalle.visibles.map((c) => c.id)).toEqual(['c2']);

    const porAutor = filtrarYOrdenarCasos(casos, opcionesBase({ busqueda: 'sofía' }));
    expect(porAutor.visibles.map((c) => c.id)).toEqual(['c1']);

    const porVinculo = filtrarYOrdenarCasos(casos, opcionesBase({ busqueda: 'mora' }));
    expect(porVinculo.visibles.map((c) => c.id)).toEqual(['c3']);
  });

  test('ordena por último rescate, más antiguo y última revisión', () => {
    expect(
      filtrarYOrdenarCasos(casos, opcionesBase({ orden: 'ultimo_rescate' })).visibles.map((c) => c.id)
    ).toEqual(['c2', 'c1', 'c3']);

    expect(
      filtrarYOrdenarCasos(casos, opcionesBase({ orden: 'mas_antiguo' })).visibles.map((c) => c.id)
    ).toEqual(['c3', 'c1', 'c2']);

    expect(
      filtrarYOrdenarCasos(casos, opcionesBase({ orden: 'ultima_revision' })).visibles.map((c) => c.id)
    ).toEqual(['c3', 'c1', 'c2']);
  });
});
