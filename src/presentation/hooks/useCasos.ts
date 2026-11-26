import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { authRepository } from '../../di/container';
import { Voluntario } from '../../domain/models/Ajustes';
import { UMBRAL_URGENTE_DIAS } from '../../domain/models/Caso';
import { filtrarYOrdenarCasos } from '../../domain/services/FiltrarCasos';
import { useCasoStore, FiltroUrgencia, FiltroEstado, OrdenCasos } from '../stores/useCasoStore';
import { obtenerAjustes } from './useAjustes';

export type { FiltroUrgencia, FiltroEstado, OrdenCasos };

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

  const { visibles, conteo, estadosDisponibles, cantidadMios } = useMemo(
    () =>
      filtrarYOrdenarCasos(casos, {
        busqueda,
        filtroUrgencia: filtro,
        soloMios,
        estadoFiltro,
        orden,
        umbralDias: umbral,
        voluntario,
      }),
    [casos, busqueda, filtro, soloMios, estadoFiltro, orden, umbral, voluntario]
  );

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
