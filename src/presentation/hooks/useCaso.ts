import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Caso, EventoHistorial } from '../../domain/models/Caso';
import { useCasoStore } from '../stores/useCasoStore';

export function useCaso(id: string) {
  const casoSeleccionado = useCasoStore((s) => s.casoSeleccionado);
  const historial = useCasoStore((s) => s.historial);
  const cargarDetalleCaso = useCasoStore((s) => s.cargarDetalleCaso);
  const [cargando, setCargando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setCargando(true);
      cargarDetalleCaso(id).finally(() => setCargando(false));
    }, [id, cargarDetalleCaso])
  );

  const caso = casoSeleccionado?.id === id ? casoSeleccionado : undefined;

  return { caso, historial, cargando };
}
