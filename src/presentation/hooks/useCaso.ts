import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { CasoRepositoryImpl } from '../../data/repositories/CasoRepositoryImpl';
import { Caso } from '../../domain/models/Caso';
import { ObtenerCaso } from '../../domain/usecases/ObtenerCaso';

const obtenerCaso = new ObtenerCaso(new CasoRepositoryImpl());

export function useCaso(id: string) {
  const [caso, setCaso] = useState<Caso | undefined>();
  const [cargando, setCargando] = useState(true);

  // Se recarga cada vez que la pantalla vuelve a estar en foco (ej: después de cambiar el estado).
  useFocusEffect(
    useCallback(() => {
      obtenerCaso
        .ejecutar(id)
        .then((c) => setCaso(c ? { ...c } : undefined))
        .finally(() => setCargando(false));
    }, [id]),
  );

  return { caso, cargando };
}
