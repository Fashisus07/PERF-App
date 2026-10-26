import { create } from 'zustand';
import {
  Caso,
  calcularUrgencia,
  diasEnEspera,
  EstadoCaso,
  EventoHistorial,
  Urgencia,
} from '../../domain/models/Caso';
import { BorradorRescate } from '../../domain/models/Rescate';
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
