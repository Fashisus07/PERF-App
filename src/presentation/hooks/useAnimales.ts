import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { AnimalCaso } from '../../domain/models/Animal';
import { casoRepository } from '../../di/container';

/** Animales de un caso (ficha sanitaria individual). Se recarga cada vez que la pantalla toma el foco. */
export function useAnimales(casoId: string) {
  const [animales, setAnimales] = useState<AnimalCaso[]>([]);
  const [cargando, setCargando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let vigente = true;
      setCargando(true);
      casoRepository
        .obtenerAnimales(casoId)
        .then((a) => vigente && setAnimales(a))
        .finally(() => vigente && setCargando(false));
      return () => {
        vigente = false;
      };
    }, [casoId])
  );

  return { animales, cargando };
}
