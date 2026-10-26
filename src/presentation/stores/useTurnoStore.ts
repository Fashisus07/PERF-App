import { create } from 'zustand';
import { Clinica, SolicitudTurno, Turno } from '../../domain/models/Turno';
import { Caso } from '../../domain/models/Caso';
import {
  turnoRepository,
  listarTurnosUseCase,
  agendarTurnoUseCase,
  recordatorioService,
} from '../../di/container';
import { TurnoAgendado } from '../../domain/usecases/AgendarTurno';

interface TurnoState {
  turnos: Turno[];
  clinicas: Clinica[];
  cargando: boolean;
  error: string | null;

  cargarTurnos: (ahora?: Date) => Promise<void>;
  agendarTurno: (solicitud: SolicitudTurno, caso: Caso) => Promise<TurnoAgendado>;
  cancelarTurno: (turnoId: string) => Promise<void>;
  marcarCumplido: (turnoId: string) => Promise<void>;
}

export const useTurnoStore = create<TurnoState>((set, get) => ({
  turnos: [],
  clinicas: [],
  cargando: false,
  error: null,

  cargarTurnos: async (ahora = new Date()) => {
    set({ cargando: true, error: null });
    try {
      const resultado = await listarTurnosUseCase.ejecutar(ahora);
      set({
        turnos: resultado.turnos,
        clinicas: resultado.clinicas,
        cargando: false,
        error: null,
      });
    } catch (e: any) {
      set({ cargando: false, error: e?.message || 'Error al cargar turnos' });
    }
  },

  agendarTurno: async (solicitud: SolicitudTurno, caso: Caso) => {
    set({ cargando: true, error: null });
    try {
      const res = await agendarTurnoUseCase.ejecutar(solicitud, caso);
      set((state) => ({
        turnos: [...state.turnos, res.turno].sort((a, b) => a.fechaHora - b.fechaHora),
        cargando: false,
      }));
      return res;
    } catch (e: any) {
      set({ cargando: false, error: e?.message || 'Error al agendar turno' });
      throw e;
    }
  },

  cancelarTurno: async (turnoId: string) => {
    try {
      await recordatorioService.cancelar(turnoId);
      await turnoRepository.cancelar(turnoId);
      set((state) => ({
        turnos: state.turnos.filter((t) => t.id !== turnoId),
      }));
    } catch (e: any) {
      set({ error: e?.message || 'Error al cancelar turno' });
      throw e;
    }
  },

  marcarCumplido: async (turnoId: string) => {
    try {
      const actualizado = await turnoRepository.marcarCumplido(turnoId);
      set((state) => ({
        turnos: state.turnos.map((t) => (t.id === turnoId ? actualizado : t)),
      }));
    } catch (e: any) {
      set({ error: e?.message || 'Error al actualizar turno' });
      throw e;
    }
  },
}));
