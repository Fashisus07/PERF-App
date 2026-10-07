import { useEffect, useMemo, useState } from 'react';
import { CasoRepositoryImpl } from '../../data/repositories/CasoRepositoryImpl';
import { Caso, Urgencia } from '../../domain/models/Caso';
import { ListarCasosPorUrgencia } from '../../domain/usecases/ListarCasosPorUrgencia';

export type FiltroUrgencia = 'todos' | Urgencia;

// Composición simple de dependencias (sin framework de DI).
const listarCasos = new ListarCasosPorUrgencia(new CasoRepositoryImpl());

export function useCasos() {
  const [casos, setCasos] = useState<Caso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroUrgencia>('todos');

  useEffect(() => {
    listarCasos.ejecutar().then((c) => {
      setCasos(c);
      setCargando(false);
    });
  }, []);

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

  return { visibles, conteo, cargando, busqueda, setBusqueda, filtro, setFiltro };
}
