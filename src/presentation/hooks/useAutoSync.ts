import { useEffect, useRef, useState } from 'react';
import { sincronizarAhora } from './useAjustes';
import { useOnline } from './useOnline';
import { useCasoStore } from '../stores/useCasoStore';
import { useTurnoStore } from '../stores/useTurnoStore';

export function useAutoSync() {
  const online = useOnline();
  const previoOnline = useRef(online);
  const [sincronizando, setSincronizando] = useState(false);
  const cargarCasos = useCasoStore((s) => s.cargarCasos);
  const cargarTurnos = useTurnoStore((s) => s.cargarTurnos);

  useEffect(() => {
    // Detecta cuando recupera señal (offline -> online)
    if (!previoOnline.current && online) {
      setSincronizando(true);
      sincronizarAhora
        .ejecutar(true)
        .then(async () => {
          await Promise.all([cargarCasos(10, true), cargarTurnos()]);
        })
        .catch(() => {})
        .finally(() => {
          setSincronizando(false);
        });
    }
    previoOnline.current = online;
  }, [online, cargarCasos, cargarTurnos]);

  return { sincronizando, online };
}
