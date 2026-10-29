import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ajustesRepository,
  casoRepository,
  guardarAjustesUseCase,
  obtenerAjustesUseCase,
  sincronizarAhoraUseCase,
} from '../../di/container';
import { Ajustes, ajustesPorDefecto, ResumenAlmacenamiento } from '../../domain/models/Ajustes';

export const sincronizarAhora = sincronizarAhoraUseCase;

// Para los demás hooks (lista de casos, detalle, formulario de turnos): leen los ajustes guardados.
export const obtenerAjustes = () => obtenerAjustesUseCase.ejecutar();

export function useAjustes() {
  const [guardados, setGuardados] = useState<Ajustes>(ajustesPorDefecto);
  const [borrador, setBorrador] = useState<Ajustes>(ajustesPorDefecto);
  const [resumen, setResumen] = useState<ResumenAlmacenamiento | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(() => {
    Promise.all([obtenerAjustesUseCase.ejecutar(), casoRepository.resumenAlmacenamiento()])
      .then(([a, r]) => {
        setGuardados(a);
        setBorrador(a);
        setResumen(r);
      })
      .finally(() => setCargando(false));
  }, []);

  useFocusEffect(cargar);

  const cambiar = (cambios: Partial<Ajustes>) => setBorrador((b) => ({ ...b, ...cambios }));
  const hayCambios = JSON.stringify(borrador) !== JSON.stringify(guardados);

  const guardarCambios = async () => {
    const limpios = await guardarAjustesUseCase.ejecutar(borrador);
    setGuardados(limpios);
    setBorrador(limpios);
  };

  const actualizarResumen = () => casoRepository.resumenAlmacenamiento().then(setResumen);

  return { borrador, cambiar, hayCambios, guardarCambios, resumen, actualizarResumen, cargando };
}
