import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { authRepository } from '../../di/container';
import { esMiCaso, Voluntario } from '../../domain/models/Ajustes';
import { Caso, prioridadDeCaso, UMBRAL_URGENTE_DIAS } from '../../domain/models/Caso';
import { useCasoStore, FiltroUrgencia, FiltroEstado, OrdenCasos } from '../stores/useCasoStore';
import { obtenerAjustes } from './useAjustes';

export type { FiltroUrgencia, FiltroEstado, OrdenCasos };

// Misma regla de urgencia que muestran las tarjetas: se calcula hoy con el umbral de Ajustes.
function urgenciaDe(c: Caso, umbral: number) {
  return prioridadDeCaso(c, umbral).urgencia;
}

export function useCasos() {
  const casos = useCasoStore((s) => s.casos);
  const cargando = useCasoStore((s) => s.cargando);
  const error = useCasoStore((s) => !!s.error);
  const busqueda = useCasoStore((s) => s.busqueda);
  const setBusqueda = useCasoStore((s) => s.setBusqueda);
  const filtro = useCasoStore((s) => s.filtroUrgencia);
  const setFiltro = useCasoStore((s) => s.setFiltroUrgencia);
  const soloMios = useCasoStore((s) => s.soloMios);
  const setSoloMios = useCasoStore((s) => s.setSoloMios);
  const orden = useCasoStore((s) => s.orden);
  const setOrden = useCasoStore((s) => s.setOrden);
  const estadoFiltro = useCasoStore((s) => s.estadoFiltro);
  const setEstadoFiltro = useCasoStore((s) => s.setEstadoFiltro);
  const limpiarFiltros = useCasoStore((s) => s.limpiarFiltros);
  const cargarCasos = useCasoStore((s) => s.cargarCasos);
  const umbral = useCasoStore((s) => s.umbralDias);

  const [voluntario, setVoluntario] = useState<Voluntario | null>(null);
  useEffect(() => {
    authRepository.obtenerVoluntarioActual().then(setVoluntario).catch(() => setVoluntario(null));
  }, []);

  const cargar = useCallback(async (silencioso = false) => {
    try {
      const ajustes = await obtenerAjustes();
      await cargarCasos(ajustes.umbralUrgenteDias, silencioso);
    } catch {
      await cargarCasos(UMBRAL_URGENTE_DIAS, silencioso);
    }
  }, [cargarCasos]);

  const primera = useRef(true);
  useFocusEffect(
    useCallback(() => {
      cargar(!primera.current);
      primera.current = false;
    }, [cargar])
  );

  // Con "Mis casos" activo solo se ven los que sigue el voluntario de la sesión.
  const base = useMemo(() => {
    const deMios = soloMios ? casos.filter((c) => esMiCaso(c, voluntario)) : casos;
    return estadoFiltro === 'todos' ? deMios : deMios.filter((c) => c.estadoCaso === estadoFiltro);
  }, [casos, soloMios, voluntario, estadoFiltro]);
  const estadosDisponibles = useMemo(
    () => Array.from(new Set(casos.map((c) => c.estadoCaso))),
    [casos]
  );
  const cantidadMios = useMemo(
    () => casos.filter((c) => esMiCaso(c, voluntario)).length,
    [casos, voluntario]
  );

  const conteo = useMemo(
    () => ({
      todos: base.length,
      urgente: base.filter((c) => urgenciaDe(c, umbral) === 'urgente').length,
      atencion: base.filter((c) => urgenciaDe(c, umbral) === 'atencion').length,
      aldia: base.filter((c) => urgenciaDe(c, umbral) === 'aldia').length,
    }),
    [base, umbral]
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtrados = base.filter((c) => {
      const urg = urgenciaDe(c, umbral);
      const cumpleFiltro = filtro === 'todos' || urg === filtro;
      const cumpleBusqueda =
        !q ||
        c.nombreProvisorio.toLowerCase().includes(q) ||
        c.barrio.toLowerCase().includes(q) ||
        c.quienSigueCaso.toLowerCase().includes(q);
      return cumpleFiltro && cumpleBusqueda;
    });
    // 'prioridad' respeta el orden que ya trae la lista (urgentes primero, después más días de espera).
    if (orden === 'ultimo_rescate') return filtrados.slice().sort((a, b) => b.fechaRescate - a.fechaRescate);
    if (orden === 'mas_antiguo') return filtrados.slice().sort((a, b) => a.fechaRescate - b.fechaRescate);
    if (orden === 'ultima_revision') return filtrados.slice().sort((a, b) => (b.fechaUltimaRevision ?? b.updatedAt) - (a.fechaUltimaRevision ?? a.updatedAt));
    return filtrados;
  }, [base, busqueda, filtro, orden, umbral]);

  return {
    visibles,
    conteo,
    casos,
    cargando,
    error,
    recargar: () => cargar(false),
    busqueda,
    setBusqueda,
    filtro,
    setFiltro,
    soloMios,
    setSoloMios,
    cantidadMios,
    sesionIniciada: !!voluntario,
    orden,
    setOrden,
    estadoFiltro,
    setEstadoFiltro,
    estadosDisponibles,
    limpiarFiltros,
    filtrosActivos: (orden !== 'prioridad' ? 1 : 0) + (estadoFiltro !== 'todos' ? 1 : 0),
  };
}
