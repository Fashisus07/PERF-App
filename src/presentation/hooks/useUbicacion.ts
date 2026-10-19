import * as Location from 'expo-location';
import { useCallback, useState } from 'react';
import { Coordenadas } from '../../domain/models/Rescate';

// Si el GPS no responde a tiempo (sin señal, sin servicios de Google) no dejamos la pantalla esperando.
const conLimite = <T,>(promesa: Promise<T>, ms: number) =>
  Promise.race([promesa, new Promise<never>((_, rechazar) => setTimeout(() => rechazar(new Error('timeout')), ms))]);

export type UbicacionRescate = { texto: string; coordenadas: Coordenadas };
export type EstadoGps = 'inactivo' | 'buscando' | 'activo' | 'denegado' | 'error';

// Pide el permiso, lee el GPS y lo convierte en una dirección legible ("Barrio, Calle 123").
export function useUbicacion() {
  const [estado, setEstado] = useState<EstadoGps>('inactivo');

  const obtener = useCallback(async (): Promise<UbicacionRescate | null> => {
    setEstado('buscando');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setEstado('denegado');
        return null;
      }
      // Primero la última posición conocida (instantánea); si no hay, se pide una nueva.
      const pos =
        (await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 })) ??
        (await conLimite(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), 15000));
      const coordenadas = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      let texto = '';
      try {
        const [d] = await Location.reverseGeocodeAsync(pos.coords);
        if (d) {
          const barrio = d.district ?? d.subregion ?? d.city ?? '';
          const calle = [d.street, d.streetNumber].filter(Boolean).join(' ') || d.name || '';
          texto = [barrio, calle].filter(Boolean).join(', ');
        }
      } catch {
        // sin red o sin servicio de geocodificación: usamos las coordenadas
      }
      if (!texto) texto = `${coordenadas.lat.toFixed(5)}, ${coordenadas.lng.toFixed(5)}`;
      setEstado('activo');
      return { texto, coordenadas };
    } catch {
      setEstado('error');
      return null;
    }
  }, []);

  return { estado, obtener };
}
