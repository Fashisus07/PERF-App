import * as Location from 'expo-location';
import { useCallback, useState } from 'react';
import { Coordenadas } from '../../domain/models/Rescate';

export type UbicacionRescate = {
  texto: string;
  coordenadas: Coordenadas;
  /** true cuando se obtuvo lat/lng del GPS pero no se pudo resolver el nombre del barrio (p. ej. sin red). */
  sinBarrio?: boolean;
};

export type EstadoGps = 'inactivo' | 'buscando' | 'activo' | 'denegado' | 'error';

/** Detecta si un texto de barrio son en realidad coordenadas crudas "lat, lng". */
export function esTextoCoordenadas(texto?: string | null): boolean {
  if (!texto) return false;
  return /^-?\d{1,3}\.\d+\s*,\s*-?\d{1,3}\.\d+$/.test(texto.trim());
}

/** Construye "Barrio, Calle altura" evitando textos vacíos o duplicados. */
export function formatearUbicacionGeocodificada(partes: {
  barrio?: string | null;
  ciudad?: string | null;
  calle?: string | null;
  altura?: string | null;
  nombre?: string | null;
}): string {
  const barrio = (partes.barrio || partes.ciudad || '').trim();
  const calleConAltura = [partes.calle, partes.altura].filter(Boolean).join(' ').trim();
  const calle = calleConAltura || (partes.nombre || '').trim();
  // En algunos dispositivos Android d.name repite las coordenadas o la ciudad
  const calleValida = calle && !esTextoCoordenadas(calle) && calle !== barrio ? calle : '';
  return [barrio, calleValida].filter(Boolean).join(', ');
}

async function geocodificarConNominatim(coords: Coordenadas): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitud}&lon=${coords.longitud}&accept-language=es`;
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'PERF-Movil/1.0 (Rescate Animal)' },
    });
    clearTimeout(timer);
    if (!resp.ok) return '';
    const json: any = await resp.json();
    const a = json?.address;
    if (!a) return '';
    return formatearUbicacionGeocodificada({
      barrio: a.neighbourhood || a.suburb || a.quarter || a.city_district || a.town || a.village,
      ciudad: a.city || a.state_district || a.state,
      calle: a.road,
      altura: a.house_number,
    });
  } catch {
    return '';
  }
}

// Obtiene coordenadas por GPS y las traduce a dirección/barrio. Nunca escribe coordenadas crudas en `texto`.
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
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coordenadas: Coordenadas = {
        latitud: pos.coords.latitude,
        longitud: pos.coords.longitude,
      };

      let texto = '';
      try {
        const [d] = await Location.reverseGeocodeAsync(pos.coords);
        if (d) {
          texto = formatearUbicacionGeocodificada({
            barrio: d.district ?? d.subregion,
            ciudad: d.city,
            calle: d.street,
            altura: d.streetNumber,
            nombre: d.name,
          });
        }
      } catch {
        // Servicio nativo no disponible: intentamos respaldo Nominatim si hay conectividad
      }

      if (!texto) {
        texto = await geocodificarConNominatim(coordenadas);
      }

      setEstado('activo');
      return {
        texto,
        coordenadas,
        sinBarrio: !texto,
      };
    } catch {
      setEstado('error');
      return null;
    }
  }, []);

  return { estado, obtener };
}
