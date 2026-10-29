import { create } from 'zustand';
import {
  Caso,
  calcularUrgencia,
  diasEnEspera,
  EstadoCaso,
  EventoHistorial,
  TipoEvento,
  Urgencia,
} from '../../domain/models/Caso';
import { BorradorRescate } from '../../domain/models/Rescate';
import { generarUUID } from '../../data/local/uuid';
import {
  casoRepository,
  listarCasosPorUrgencia,
  obtenerCasoUseCase,
  registrarRescateUseCase,
  cambiarEstadoCasoUseCase,
} from '../../di/container';

export type FiltroUrgencia = 'todos' | Urgencia;

interface CasoState {
  casos: Caso[];
  casoSeleccionado: Caso | null;
  historial: EventoHistorial[];
  cargando: boolean;
  error: string | null;
  filtroUrgencia: FiltroUrgencia;
  busqueda: string;

  // Acciones
  cargarCasos: (umbralDias?: number, silencioso?: boolean) => Promise<void>;
  cargarDetalleCaso: (id: string) => Promise<Caso | undefined>;
  registrarRescate: (borrador: BorradorRescate, sinConexion?: boolean) => Promise<Caso>;
  cambiarEstado: (id: string, nuevoEstado: EstadoCaso, motivo: string, destino?: string) => Promise<Caso>;
  actualizarCaso: (caso: Caso) => Promise<Caso>;
  agregarEventoHistorial: (casoId: string, tipo: TipoEvento, descripcion: string) => Promise<void>;
  sincronizar: () => Promise<number>;
  setFiltroUrgencia: (filtro: FiltroUrgencia) => void;
  setBusqueda: (busqueda: string) => void;
}

export const useCasoStore = create<CasoState>((set, get) => ({
  casos: [],
  casoSeleccionado: null,
  historial: [],
  cargando: false,
  error: null,
  filtroUrgencia: 'todos',
  busqueda: '',

  cargarCasos: async (umbralDias = 10, silencioso = false) => {
    if (!silencioso) set({ cargando: true, error: null });
    try {
      const lista = await listarCasosPorUrgencia.ejecutar(umbralDias);
      set({ casos: lista, cargando: false, error: null });
    } catch (e: any) {
      set({ cargando: false, error: e?.message || 'Error al cargar casos' });
    }
  },

  cargarDetalleCaso: async (id: string) => {
    try {
      const caso = await obtenerCasoUseCase.ejecutar(id);
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
      const nuevo = await registrarRescateUseCase.ejecutar(borrador, sinConexion);
      set((state) => ({
        casos: [nuevo, ...state.casos],
        cargando: false,
      }));
      return nuevo;
    } catch (e: any) {
      set({ cargando: false, error: e?.message || 'Error al guardar rescate' });
      throw e;
    }
  },

  cambiarEstado: async (id: string, nuevoEstado: EstadoCaso, motivo: string, destino?: string) => {
    set({ cargando: true, error: null });
    try {
      const actualizado = await cambiarEstadoCasoUseCase.ejecutar(id, {
        estado: nuevoEstado,
        motivo,
        destino,
      });
      const historial = await casoRepository.obtenerHistorial(id);
      set((state) => ({
        casoSeleccionado: state.casoSeleccionado?.id === id ? actualizado : state.casoSeleccionado,
        historial,
        casos: state.casos.map((c) => (c.id === id ? actualizado : c)),
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
        casos: state.casos.map((c) => (c.id === caso.id ? actualizado : c)),
        cargando: false,
      }));
      return actualizado;
    } catch (e: any) {
      set({ cargando: false, error: e?.message || 'Error al actualizar caso' });
      throw e;
    }
  },

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
      await get().cargarCasos(10, true);
      return cantidad;
    } catch (e: any) {
      set({ error: e?.message || 'Error al sincronizar' });
      return 0;
    }
  },

  setFiltroUrgencia: (filtroUrgencia: FiltroUrgencia) => set({ filtroUrgencia }),
  setBusqueda: (busqueda: string) => set({ busqueda }),
}));
