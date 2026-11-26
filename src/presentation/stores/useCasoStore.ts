import { create } from 'zustand';
import {
  Caso,
  Coordinador,
  Especie,
  EstadoCaso,
  EventoHistorial,
  GravedadClinica,
  RegistroTestAnimal,
  RelacionAnimal,
  TestViralFijo,
  TipoEvento,
  UMBRAL_URGENTE_DIAS,
  Urgencia,
  Vulnerabilidad,
} from '../../domain/models/Caso';
import { BorradorRescate } from '../../domain/models/Rescate';
import { generarUUID } from '../../data/local/uuid';
import {
  ajustesRepository,
  authRepository,
  casoRepository,
  listarCasosPorUrgencia,
  obtenerCasoUseCase,
  registrarRescateUseCase,
  cambiarEstadoCasoUseCase,
} from '../../di/container';

export type FiltroUrgencia = 'todos' | Urgencia;

export interface OpcionesCambioEstadoStore {
  destino?: string;
  gravedadClinica?: GravedadClinica;
  vulnerabilidad?: Vulnerabilidad;
}

/** Cómo se ordena la bandeja: por prioridad (urgentes primero) o por fechas. */
export type OrdenCasos = 'prioridad' | 'ultimo_rescate' | 'mas_antiguo' | 'ultima_revision';
export type FiltroEstado = 'todos' | EstadoCaso;

interface CasoState {
  casos: Caso[];
  casoSeleccionado: Caso | null;
  historial: EventoHistorial[];
  cargando: boolean;
  error: string | null;
  filtroUrgencia: FiltroUrgencia;
  busqueda: string;
  soloMios: boolean;
  orden: OrdenCasos;
  estadoFiltro: FiltroEstado;

  // Acciones
  /** Umbral de días con el que se calculan las urgencias que se muestran (viene de Ajustes). */
  umbralDias: number;
  cargarCasos: (umbralDias?: number, silencioso?: boolean) => Promise<void>;
  cargarDetalleCaso: (id: string) => Promise<Caso | undefined>;
  registrarRescate: (borrador: BorradorRescate, sinConexion?: boolean) => Promise<Caso>;
  cambiarEstado: (
    id: string,
    nuevoEstado: EstadoCaso,
    motivo: string,
    destinoOrOpciones?: string | OpcionesCambioEstadoStore
  ) => Promise<Caso>;
  actualizarCaso: (caso: Caso) => Promise<Caso>;
  guardarResultadoTest: (registro: RegistroTestAnimal) => Promise<RegistroTestAnimal>;
  guardarRelacion: (relacion: RelacionAnimal) => Promise<RelacionAnimal>;
  eliminarRelacion: (relacionId: string) => Promise<void>;
  obtenerCoordinadores: () => Promise<Coordinador[]>;
  obtenerCatalogoTests: (especie?: Especie) => Promise<TestViralFijo[]>;
  agregarEventoHistorial: (casoId: string, tipo: TipoEvento, descripcion: string) => Promise<void>;
  sincronizar: () => Promise<number>;
  setFiltroUrgencia: (filtro: FiltroUrgencia) => void;
  setBusqueda: (busqueda: string) => void;
  setSoloMios: (soloMios: boolean) => void;
  setOrden: (orden: OrdenCasos) => void;
  setEstadoFiltro: (estado: FiltroEstado) => void;
  limpiarFiltros: () => void;
}

async function leerUmbralConfigurado(umbralExplicito?: number): Promise<number> {
  if (umbralExplicito != null) return umbralExplicito;
  try {
    const ajustes = await ajustesRepository.obtener();
    return ajustes.umbralUrgenteDias;
  } catch {
    return 15;
  }
}

export const useCasoStore = create<CasoState>((set, get) => ({
  casos: [],
  casoSeleccionado: null,
  historial: [],
  cargando: false,
  error: null,
  filtroUrgencia: 'todos',
  busqueda: '',
  soloMios: false,
  orden: 'prioridad',
  estadoFiltro: 'todos',

  umbralDias: UMBRAL_URGENTE_DIAS,

  cargarCasos: async (umbralDias?: number, silencioso = false) => {
    if (!silencioso) set({ cargando: true, error: null });
    try {
      const umbral = await leerUmbralConfigurado(umbralDias);
      const lista = await listarCasosPorUrgencia.ejecutar(umbral);
      set({ casos: lista, umbralDias: umbral, cargando: false, error: null });
    } catch (e: any) {
      set({ cargando: false, error: e?.message || 'Error al cargar casos' });
    }
  },

  cargarDetalleCaso: async (id: string) => {
    try {
      const umbral = await leerUmbralConfigurado();
      const caso = await obtenerCasoUseCase.ejecutar(id, umbral);
      if (caso) {
        const historial = await casoRepository.obtenerHistorial(id);
        set({ casoSeleccionado: caso, historial });
        return caso;
      }
      return undefined;
    } catch (e: any) {
      set({ error: e?.message || 'Error al obtener caso' });
      return undefined;
    }
  },

  registrarRescate: async (borrador: BorradorRescate, sinConexion = false) => {
    set({ cargando: true, error: null });
    try {
      const autor = await authRepository.obtenerVoluntarioActual().catch(() => null);
      const nuevo = await registrarRescateUseCase.ejecutar(
        borrador,
        sinConexion,
        autor ? { id: autor.id, nombre: autor.nombre } : null
      );
      const umbral = await leerUmbralConfigurado();
      const lista = await listarCasosPorUrgencia.ejecutar(umbral);
      set({ casos: lista, umbralDias: umbral, cargando: false });
      return nuevo;
    } catch (e: any) {
      set({ cargando: false, error: e?.message || 'Error al guardar rescate' });
      throw e;
    }
  },

  cambiarEstado: async (
    id: string,
    nuevoEstado: EstadoCaso,
    motivo: string,
    destinoOrOpciones?: string | OpcionesCambioEstadoStore
  ) => {
    set({ cargando: true, error: null });
    try {
      const umbral = await leerUmbralConfigurado();
      const opciones: OpcionesCambioEstadoStore =
        typeof destinoOrOpciones === 'string' ? { destino: destinoOrOpciones } : destinoOrOpciones ?? {};

      const actualizado = await cambiarEstadoCasoUseCase.ejecutar(id, {
        estado: nuevoEstado,
        motivo,
        destino: opciones.destino,
        gravedadClinica: opciones.gravedadClinica,
        vulnerabilidad: opciones.vulnerabilidad,
        umbralDias: umbral,
      });
      const historial = await casoRepository.obtenerHistorial(id);
      const cerrado = nuevoEstado === 'ADOPTADO' || nuevoEstado === 'FALLECIDO';
      set((state) => ({
        casoSeleccionado: state.casoSeleccionado?.id === id ? actualizado : state.casoSeleccionado,
        historial,
        casos: cerrado
          ? state.casos.filter((c) => c.id !== id)
          : state.casos
              .map((c) => (c.id === id ? actualizado : c))
              .sort((a, b) => b.puntajePrioridad - a.puntajePrioridad || b.fechaRescate - a.fechaRescate),
        cargando: false,
      }));
      return actualizado;
    } catch (e: any) {
      set({ cargando: false, error: e?.message || 'Error al cambiar estado' });
      throw e;
    }
  },

  actualizarCaso: async (caso: Caso) => {
    set({ cargando: true, error: null });
    try {
      const actualizado = await casoRepository.actualizar(caso);
      set((state) => ({
        casoSeleccionado: state.casoSeleccionado?.id === caso.id ? actualizado : state.casoSeleccionado,
        casos: state.casos
          .map((c) => (c.id === caso.id ? actualizado : c))
          .sort((a, b) => b.puntajePrioridad - a.puntajePrioridad || b.fechaRescate - a.fechaRescate),
        cargando: false,
      }));
      return actualizado;
    } catch (e: any) {
      set({ cargando: false, error: e?.message || 'Error al actualizar caso' });
      throw e;
    }
  },

  guardarResultadoTest: async (registro: RegistroTestAnimal) => {
    const guardado = await casoRepository.guardarResultadoTest(registro);
    const umbral = await leerUmbralConfigurado();
    const actualizado = await obtenerCasoUseCase.ejecutar(registro.casoId, umbral);
    if (actualizado) {
      set((state) => ({
        casoSeleccionado: state.casoSeleccionado?.id === registro.casoId ? actualizado : state.casoSeleccionado,
        casos: state.casos
          .map((c) => (c.id === registro.casoId ? actualizado : c))
          .sort((a, b) => b.puntajePrioridad - a.puntajePrioridad || b.fechaRescate - a.fechaRescate),
      }));
    }
    return guardado;
  },

  guardarRelacion: async (relacion: RelacionAnimal) => {
    const guardada = await casoRepository.guardarRelacion(relacion);
    const umbral = await leerUmbralConfigurado();
    const lista = await listarCasosPorUrgencia.ejecutar(umbral);
    const seleccionadoId = get().casoSeleccionado?.id;
    const seleccionadoActualizado = seleccionadoId ? lista.find((c) => c.id === seleccionadoId) ?? get().casoSeleccionado : null;
    set({ casos: lista, casoSeleccionado: seleccionadoActualizado });
    return guardada;
  },

  eliminarRelacion: async (relacionId: string) => {
    await casoRepository.eliminarRelacion(relacionId);
    const umbral = await leerUmbralConfigurado();
    const lista = await listarCasosPorUrgencia.ejecutar(umbral);
    const seleccionadoId = get().casoSeleccionado?.id;
    const seleccionadoActualizado = seleccionadoId ? lista.find((c) => c.id === seleccionadoId) ?? get().casoSeleccionado : null;
    set({ casos: lista, casoSeleccionado: seleccionadoActualizado });
  },

  obtenerCoordinadores: () => casoRepository.obtenerCoordinadores(),
  obtenerCatalogoTests: (especie?: Especie) => casoRepository.obtenerCatalogoTests(especie),

  agregarEventoHistorial: async (casoId: string, tipo: TipoEvento, descripcion: string) => {
    try {
      const nuevoEvento: EventoHistorial = {
        id: generarUUID(),
        casoId,
        tipo,
        descripcion,
        fecha: Date.now(),
        syncStatus: 'PENDING',
      };
      await casoRepository.agregarEvento(nuevoEvento);
      const historial = await casoRepository.obtenerHistorial(casoId);
      set({ historial });
    } catch (e: any) {
      set({ error: e?.message || 'Error al agregar evento al historial' });
      throw e;
    }
  },

  sincronizar: async () => {
    try {
      const cantidad = await casoRepository.sincronizar();
      await get().cargarCasos(undefined, true);
      return cantidad;
    } catch (e: any) {
      set({ error: e?.message || 'Error al sincronizar' });
      return 0;
    }
  },

  setFiltroUrgencia: (filtroUrgencia: FiltroUrgencia) => set({ filtroUrgencia }),
  setBusqueda: (busqueda: string) => set({ busqueda }),
  setSoloMios: (soloMios: boolean) => set({ soloMios }),
  setOrden: (orden: OrdenCasos) => set({ orden }),
  setEstadoFiltro: (estadoFiltro: FiltroEstado) => set({ estadoFiltro }),
  limpiarFiltros: () => set({ orden: 'prioridad', estadoFiltro: 'todos', filtroUrgencia: 'todos' }),
}));
