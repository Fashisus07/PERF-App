import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { AjustesRepositoryImpl } from '../../data/local/AjustesRepositoryImpl';
import { CasoRepositoryImpl } from '../../data/repositories/CasoRepositoryImpl';
import { Ajustes, ajustesPorDefecto, ResumenAlmacenamiento } from '../../domain/models/Ajustes';
import { GuardarAjustes, ObtenerAjustes } from '../../domain/usecases/GuardarAjustes';
import { SincronizarAhora } from '../../domain/usecases/SincronizarAhora';

// Composición simple de dependencias (sin framework de DI).
const ajustesRepo = new AjustesRepositoryImpl();
const casoRepo = new CasoRepositoryImpl();
const obtener = new ObtenerAjustes(ajustesRepo);
const guardar = new GuardarAjustes(ajustesRepo);
export const sincronizarAhora = new SincronizarAhora(casoRepo);

// Para los demás hooks (lista de casos, detalle, formulario de turnos): leen los ajustes guardados.
export const obtenerAjustes = () => obtener.ejecutar();

export function useAjustes() {
  const [guardados, setGuardados] = useState<Ajustes>(ajustesPorDefecto);
  const [borrador, setBorrador] = useState<Ajustes>(ajustesPorDefecto);
  const [resumen, setResumen] = useState<ResumenAlmacenamiento | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(() => {
    Promise.all([obtener.ejecutar(), casoRepo.resumenAlmacenamiento()])
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
    const limpios = await guardar.ejecutar(borrador);
    setGuardados(limpios);
    setBorrador(limpios);
  };

  const actualizarResumen = () => casoRepo.resumenAlmacenamiento().then(setResumen);

  return { borrador, cambiar, hayCambios, guardarCambios, resumen, actualizarResumen, cargando };
}
