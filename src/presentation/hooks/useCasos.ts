import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useRef } from 'react';
import { calcularUrgencia, Caso } from '../../domain/models/Caso';
import { useCasoStore, FiltroUrgencia } from '../stores/useCasoStore';
import { obtenerAjustes } from './useAjustes';

export type { FiltroUrgencia };

export function useCasos() {
  const casos = useCasoStore((s) => s.casos);
  const cargando = useCasoStore((s) => s.cargando);
  const error = useCasoStore((s) => !!s.error);
  const busqueda = useCasoStore((s) => s.busqueda);
  const setBusqueda = useCasoStore((s) => s.setBusqueda);
  const filtro = useCasoStore((s) => s.filtroUrgencia);
  const setFiltro = useCasoStore((s) => s.setFiltroUrgencia);
  const cargarCasos = useCasoStore((s) => s.cargarCasos);

  const cargar = useCallback(async (silencioso = false) => {
    try {
      const ajustes = await obtenerAjustes();
      await cargarCasos(ajustes.umbralUrgenteDias, silencioso);
    } catch {
      await cargarCasos(10, silencioso);
    }
  }, [cargarCasos]);

  const primera = useRef(true);
  useFocusEffect(
    useCallback(() => {
      cargar(!primera.current);
      primera.current = false;
    }, [cargar])
  );

  const conteo = useMemo(
    () => ({
      todos: casos.length,
      urgente: casos.filter((c) => calcularUrgencia(c, 10) === 'urgente').length,
      atencion: casos.filter((c) => calcularUrgencia(c, 10) === 'atencion').length,
      aldia: casos.filter((c) => calcularUrgencia(c, 10) === 'aldia').length,
    }),
    [casos]
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return casos.filter((c) => {
      const urg = calcularUrgencia(c, 10);
      const cumpleFiltro = filtro === 'todos' || urg === filtro;
      const cumpleBusqueda =
        !q ||
        c.nombreProvisorio.toLowerCase().includes(q) ||
        c.barrio.toLowerCase().includes(q) ||
        c.quienSigueCaso.toLowerCase().includes(q);
      return cumpleFiltro && cumpleBusqueda;
    });
  }, [casos, busqueda, filtro]);

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
  };
}
