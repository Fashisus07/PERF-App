import { useCallback, useEffect, useMemo, useState } from 'react';
import { CasoRepositoryImpl } from '../../data/repositories/CasoRepositoryImpl';
import { Caso, Urgencia } from '../../domain/models/Caso';
import { ListarCasosPorUrgencia } from '../../domain/usecases/ListarCasosPorUrgencia';

export type FiltroUrgencia = 'todos' | Urgencia;

// Composición simple de dependencias (sin framework de DI).
const listarCasos = new ListarCasosPorUrgencia(new CasoRepositoryImpl());

export function useCasos() {
  const [casos, setCasos] = useState<Caso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroUrgencia>('todos');

  const cargar = useCallback(() => {
    setCargando(true);
    setError(false);
    listarCasos
      .ejecutar()
      .then(setCasos)
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, []);

  useEffect(cargar, [cargar]);

  const conteo = useMemo(
    () => ({
      todos: casos.length,
      urgente: casos.filter((c) => c.urgencia === 'urgente').length,
      atencion: casos.filter((c) => c.urgencia === 'atencion').length,
      aldia: casos.filter((c) => c.urgencia === 'aldia').length,
    }),
    [casos],
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return casos.filter(
      (c) =>
        (filtro === 'todos' || c.urgencia === filtro) &&
        (!q || c.nombre.toLowerCase().includes(q) || c.ubicacion.toLowerCase().includes(q)),
    );
  }, [casos, busqueda, filtro]);

  return { visibles, conteo, casos, cargando, error, recargar: cargar, busqueda, setBusqueda, filtro, setFiltro };
}
