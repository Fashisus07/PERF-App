import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { sincronizarAhora } from './useAjustes';
import { useOnline } from './useOnline';
import { useCasoStore } from '../stores/useCasoStore';
import { useTurnoStore } from '../stores/useTurnoStore';

// El encabezado está en varias pantallas: este margen evita sincronizar varias veces seguidas.
const MARGEN_MS = 15_000;
let ultimoIntento = 0;

/**
 * Sincroniza solo: al abrir la app, al volver a primer plano y al recuperar la señal.
 * Sin sesión iniciada (modo demo) o sin red no pasa nada: el motor falla en silencio y los
 * cambios quedan en la cola para el próximo intento.
 */
export function useAutoSync() {
  const online = useOnline();
  const previoOnline = useRef(online);
  const [sincronizando, setSincronizando] = useState(false);
  const cargarCasos = useCasoStore((s) => s.cargarCasos);
  const cargarTurnos = useTurnoStore((s) => s.cargarTurnos);

  const sincronizar = useCallback(
    (forzar = false) => {
      const ahora = Date.now();
      if (!forzar && ahora - ultimoIntento < MARGEN_MS) return;
      ultimoIntento = ahora;
      setSincronizando(true);
      sincronizarAhora
        .ejecutar(true)
        .then(async () => {
          await Promise.all([cargarCasos(undefined, true), cargarTurnos()]);
        })
        .catch(() => {})
        .finally(() => {
          setSincronizando(false);
        });
    },
    [cargarCasos, cargarTurnos]
  );

  useEffect(() => {
    // Detecta cuando recupera señal (offline -> online)
    if (!previoOnline.current && online) sincronizar(true);
    previoOnline.current = online;
  }, [online, sincronizar]);

  useEffect(() => {
    if (online) sincronizar();
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active' && previoOnline.current) sincronizar();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { sincronizando, online };
}
