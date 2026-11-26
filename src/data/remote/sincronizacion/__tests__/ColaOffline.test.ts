import {
  sincronizar,
  AlmacenLocal,
  ServidorRemoto,
  EstadoSync,
  OperacionCola,
  pullRemoteChanges,
} from '../MotorSincronizacion';
import { Caso, EventoHistorial } from '../../../../domain/models/Caso';
import { AnimalCaso } from '../../../../domain/models/Animal';
import { Turno } from '../../../../domain/models/Turno';

describe('Cola Offline First y Sincronización Bidireccional', () => {
  let cola: OperacionCola[];
  let casosLocales: Map<string, Caso>;
  let eventosLocales: EventoHistorial[];
  let turnosLocales: Turno[];
  let casosRemotos: Map<string, any>;
  let eventosRemotos: any[];
  let turnosRemotos: any[];
  let animalesLocales: AnimalCaso[];
  let animalesRemotos: Map<string, any>;
  let ultimaSyncGuardada: number | null;

  beforeEach(() => {
    cola = [];
    casosLocales = new Map();
    eventosLocales = [];
    turnosLocales = [];
    casosRemotos = new Map();
    eventosRemotos = [];
    turnosRemotos = [];
    animalesLocales = [];
    animalesRemotos = new Map();
    ultimaSyncGuardada = null;
  });

  const mockAlmacen: AlmacenLocal = {
    async leerCola() {
      return [...cola];
    },
    async quitarDeCola(id) {
      cola = cola.filter((c) => c.id !== id);
    },
    async registrarFallo(id) {
      const op = cola.find((c) => c.id === id);
      if (op) op.reintentos++;
    },
    async obtenerCaso(id) {
      return casosLocales.get(id);
    },
    async guardarCaso(caso) {
      casosLocales.set(caso.id, caso);
    },
    async guardarEvento(evento) {
      eventosLocales.push(evento);
    },
    async guardarTurno(turno) {
      turnosLocales.push(turno);
    },
    async guardarAnimal(animal) {
      animalesLocales = [...animalesLocales.filter((a) => a.id !== animal.id), animal];
    },
    async leerAnimalesDeCaso(casoId) {
      return animalesLocales.filter((a) => a.casoId === casoId);
    },
    async marcarAnimalSincronizado(id) {
      const a = animalesLocales.find((x) => x.id === id);
      if (a) a.syncStatus = 'SYNCED';
    },
    async leerEventosPendientes() {
      return eventosLocales.filter((e) => e.syncStatus === 'PENDING');
    },
    async leerEventosDeCaso(casoId) {
      return eventosLocales.filter((e) => e.casoId === casoId);
    },
    async marcarEventoSincronizado(id) {
      const ev = eventosLocales.find((e) => e.id === id);
      if (ev) ev.syncStatus = 'SYNCED';
    },
  };

  const mockServidor: ServidorRemoto = {
    async haySesion() {
      return true;
    },
    async insertarCaso(fila) {
      if (casosRemotos.has(fila.id)) return 'existia';
      casosRemotos.set(fila.id, fila);
      return 'creado';
    },
    async obtenerCaso(id) {
      return casosRemotos.get(id) ?? null;
    },
    async aplicarCambiosCaso(id, cambios) {
      const actual = casosRemotos.get(id);
      if (actual) {
        casosRemotos.set(id, { ...actual, ...cambios });
      }
      return { aplicados: Object.keys(cambios), conflictos: [] };
    },
    async insertarEvento(fila) {
      eventosRemotos.push(fila);
      return 'creado';
    },
    async insertarAnimal(fila) {
      if (animalesRemotos.has(fila.id)) return 'existia';
      animalesRemotos.set(fila.id, fila);
      return 'creado';
    },
    async guardarAnimal(fila) {
      animalesRemotos.set(fila.id, { ...animalesRemotos.get(fila.id), ...fila });
    },
    async listarAnimales() {
      return Array.from(animalesRemotos.values());
    },
    async insertarTurno(fila) {
      turnosRemotos.push(fila);
      return 'creado';
    },
    async marcarTurnoCumplido(id) {
      const t = turnosRemotos.find((x) => x.id === id);
      if (t) t.cumplido = true;
    },
    async borrarTurno(id) {
      turnosRemotos = turnosRemotos.filter((x) => x.id !== id);
    },
    async idsCentros() {
      return new Set(['centro-1']);
    },
    async listarCentros() {
      return [];
    },
    async listarCasos() {
      return Array.from(casosRemotos.values());
    },
    async listarEventos() {
      return [...eventosRemotos];
    },
    async listarTurnos() {
      return [...turnosRemotos];
    },
  };

  const mockEstado: EstadoSync = {
    async leerBases() {
      return {};
    },
    async guardarBases() {},
    async leerUltimaSync() {
      return ultimaSyncGuardada;
    },
    async guardarUltimaSync(ms) {
      ultimaSyncGuardada = ms;
    },
  };

  test('Operación encolada se sube al servidor y se elimina de la cola local tras éxito', async () => {
    const caso: Caso = {
      id: 'uuid-caso-100',
      nombreProvisorio: 'Pelusa',
      cantidadAnimales: 1,
      especie: 'Gato',
      edadEstimada: '3 meses',
      historiaOrigen: '',
      personalidad: '',
      estadoVisible: '',
      barrio: 'Almagro',
      coordenadas: null,
      fechaRescate: 1700000000000,
      quienSigueCaso: 'Cami',
      transito: { nombre: 'Pedro', telefono: '123' },
      sanidad: { castrado: 'NO', virales: 'NEGATIVO' },
      estadoCaso: 'EN_TRANSITO',
      gravedadClinica: 'MODERADA',
      vulnerabilidad: 'ESTABLE',
      nivelPrioridad: 'ATENCION',
      motivoUrgencia: 'ATENCIÓN • Moderado',
      puntajePrioridad: 500,
      esUrgente: false,
      syncStatus: 'PENDING',
      updatedAt: 1700000000000,
    };

    cola.push({
      id: 1,
      idempotencyKey: 'idemp-1',
      entidad: 'CASO',
      operacion: 'CREATE',
      payload: JSON.stringify(caso),
      reintentos: 0,
      createdAt: 1700000000000,
    });

    const resultado = await sincronizar({
      servidor: mockServidor,
      almacen: mockAlmacen,
      estado: mockEstado,
      ahora: () => 1700001000000,
    });

    expect(resultado.enviadas).toBe(1);
    expect(resultado.fallidas).toBe(0);
    expect(cola).toHaveLength(0); // Eliminado de la cola tras éxito
    expect(casosRemotos.has('uuid-caso-100')).toBe(true);
  });

  test('Eventos de historial y turnos son append-only: dos registros distintos coexisten sin sobreescribirse', async () => {
    const evento1: EventoHistorial = {
      id: 'ev-1',
      casoId: 'uuid-caso-100',
      tipo: 'NOTA_CAMPO',
      fecha: 1700001000000,
      descripcion: 'Primera evolución clínica',
      syncStatus: 'PENDING',
    };

    const evento2: EventoHistorial = {
      id: 'ev-2',
      casoId: 'uuid-caso-100',
      tipo: 'DESPARASITACION',
      fecha: 1700002000000,
      descripcion: 'Desparasitación administrada',
      syncStatus: 'PENDING',
    };

    eventosLocales.push(evento1, evento2);

    await sincronizar({
      servidor: mockServidor,
      almacen: mockAlmacen,
      estado: mockEstado,
      ahora: () => 1700003000000,
    });

    expect(eventosRemotos).toHaveLength(2);
    expect(eventosRemotos[0].id).toBe('ev-1');
    expect(eventosRemotos[1].id).toBe('ev-2');
  });

  test('Hidratación Pull Sync: un dispositivo nuevo sin datos locales descarga todos los casos del servidor', async () => {
    casosRemotos.set('remoto-1', {
      id: 'remoto-1',
      nombre_provisorio: 'Garfield',
      cantidad_animales: 1,
      especie: 'Gato',
      barrio: 'Boedo',
      fecha_rescate: new Date(1700000000000).toISOString(),
      estado_caso: 'EN_TRANSITO',
      gravedad_clinica: 'CRITICA',
      vulnerabilidad: 'ESTABLE',
      castrado: 'SI',
      virales_vif_vilef: 'NEGATIVO',
      updated_at: new Date(1700000000000).toISOString(),
    });

    // Dispositivo nuevo: almacén local vacío
    expect(casosLocales.size).toBe(0);

    const pullRes = await pullRemoteChanges(mockServidor, mockAlmacen, mockEstado);

    expect(pullRes.descargadas).toBe(1);
    expect(casosLocales.has('remoto-1')).toBe(true);
    expect(casosLocales.get('remoto-1')?.nombreProvisorio).toBe('Garfield');
    expect(casosLocales.get('remoto-1')?.gravedadClinica).toBe('CRITICA');
  });

  describe('Animales de un caso', () => {
    const casoBase = (): Caso => ({
      id: 'caso-camada',
      nombreProvisorio: 'Camada del patio',
      cantidadAnimales: 2,
      especie: 'Gato',
      edadEstimada: '2 meses',
      historiaOrigen: '',
      personalidad: '',
      estadoVisible: '',
      barrio: 'Caballito',
      coordenadas: null,
      fechaRescate: 1700000000000,
      quienSigueCaso: 'Cami',
      transito: { nombre: 'Ana', telefono: '1' },
      sanidad: { castrado: 'PENDIENTE', virales: 'PENDIENTE' },
      estadoCaso: 'EN_TRANSITO',
      gravedadClinica: 'MODERADA',
      vulnerabilidad: 'ESTABLE',
      nivelPrioridad: 'ATENCION',
      motivoUrgencia: '',
      puntajePrioridad: 500,
      esUrgente: false,
      syncStatus: 'PENDING',
      updatedAt: 1700000000000,
    });

    const animal = (id: string, nombre: string): AnimalCaso => ({
      id,
      casoId: 'caso-camada',
      nombre,
      castrado: 'PENDIENTE',
      virales: 'PENDIENTE',
      embarazada: false,
      pesoGramos: null,
      fechaPrimeraDesparasitacion: null,
      fechaSegundaDesparasitacion: null,
      fallecido: false,
      motivoFallecimiento: null,
      syncStatus: 'PENDING',
      updatedAt: 1700000000000,
    });

    test('Al subir un caso nuevo se suben tambien sus animales, sin duplicar si se reintenta', async () => {
      animalesLocales.push(animal('an-1', 'Camada 1'), animal('an-2', 'Camada 2'));
      const op = { id: 1, entidad: 'CASO' as const, operacion: 'CREATE' as const, payload: JSON.stringify(casoBase()), reintentos: 0, createdAt: 1700000000000 };
      cola.push(op);

      await sincronizar({ servidor: mockServidor, almacen: mockAlmacen, estado: mockEstado, ahora: () => 1700001000000 });
      expect(animalesRemotos.size).toBe(2);
      expect(animalesLocales.every((a) => a.syncStatus === 'SYNCED')).toBe(true);

      cola.push({ ...op, id: 2 }); // el mismo UUID reenviado (reintento)
      await sincronizar({ servidor: mockServidor, almacen: mockAlmacen, estado: mockEstado, ahora: () => 1700002000000 });
      expect(animalesRemotos.size).toBe(2);
    });

    test('Un cambio de sanidad de un animal se sube y no pisa a los otros animales del caso', async () => {
      animalesRemotos.set('an-1', { id: 'an-1', caso_id: 'caso-camada', nombre: 'Camada 1', castrado: 'PENDIENTE' });
      animalesRemotos.set('an-2', { id: 'an-2', caso_id: 'caso-camada', nombre: 'Camada 2', castrado: 'NO' });
      cola.push({
        id: 1,
        entidad: 'ANIMAL',
        operacion: 'UPDATE',
        payload: JSON.stringify({ ...animal('an-1', 'Camada 1'), castrado: 'SI' }),
        reintentos: 0,
        createdAt: 1700000000000,
      });

      const r = await sincronizar({ servidor: mockServidor, almacen: mockAlmacen, estado: mockEstado, ahora: () => 1700001000000 });
      expect(r.fallidas).toBe(0);
      expect(animalesRemotos.get('an-1').castrado).toBe('SI');
      expect(animalesRemotos.get('an-2').castrado).toBe('NO');
    });

    test('Un celular nuevo descarga los animales de un caso del servidor', async () => {
      animalesRemotos.set('an-9', {
        id: 'an-9',
        caso_id: 'caso-remoto',
        nombre: 'Luna',
        castrado: 'SI',
        virales_vif_vilef: 'NEGATIVO',
        embarazada: true,
        peso_gramos: 3200,
        fecha_primera_desparasitacion: '2026-10-01T00:00:00.000Z',
        fecha_segunda_desparasitacion: null,
        fallecido: false,
        motivo_fallecimiento: null,
        updated_at: '2026-10-02T00:00:00.000Z',
      });

      await sincronizar({ servidor: mockServidor, almacen: mockAlmacen, estado: mockEstado, ahora: () => 1700001000000 });
      const luna = animalesLocales.find((a) => a.id === 'an-9');
      expect(luna).toMatchObject({ nombre: 'Luna', castrado: 'SI', embarazada: true, pesoGramos: 3200, syncStatus: 'SYNCED' });
      expect(luna?.fechaPrimeraDesparasitacion).toBe(Date.parse('2026-10-01T00:00:00.000Z'));
    });

    test('No pisa los animales de un caso que tiene cambios sin subir en este celular', async () => {
      animalesRemotos.set('an-1', { id: 'an-1', caso_id: 'caso-camada', nombre: 'Viejo', castrado: 'NO', virales_vif_vilef: 'PENDIENTE', updated_at: '2026-10-02T00:00:00.000Z' });
      animalesLocales.push({ ...animal('an-1', 'Local'), castrado: 'SI' });
      // La operacion falla (sin cortar la sincronizacion): el caso queda pendiente y su animal local no se pisa.
      cola.push({ id: 1, entidad: 'CASO', operacion: 'UPDATE', payload: JSON.stringify({ id: 'caso-camada', estado_caso: 'EN_CLINICA' }), reintentos: 0, createdAt: 1 });
      const original = mockServidor.obtenerCaso;
      mockServidor.obtenerCaso = async () => {
        throw new Error('falla del servidor');
      };
      const r = await sincronizar({ servidor: mockServidor, almacen: mockAlmacen, estado: mockEstado });
      mockServidor.obtenerCaso = original;
      expect(r.fallidas).toBe(1);
      expect(animalesLocales.find((a) => a.id === 'an-1')?.nombre).toBe('Local');
    });
  });
});
