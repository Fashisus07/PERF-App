jest.mock('expo-location', () => ({}));

import { esTextoCoordenadas, formatearUbicacionGeocodificada } from '../useUbicacion';

describe('useUbicacion (geocodificación y prevención de coordenadas como barrio)', () => {
  test('detecta textos con formato de coordenadas crudas', () => {
    expect(esTextoCoordenadas('-34.60372, -58.38159')).toBe(true);
    expect(esTextoCoordenadas(' -34.61 , -58.43 ')).toBe(true);
    expect(esTextoCoordenadas('Caballito')).toBe(false);
    expect(esTextoCoordenadas('Caballito, Av. Rivadavia 4500')).toBe(false);
    expect(esTextoCoordenadas('')).toBe(false);
  });

  test('formatea barrio y calle omitiendo coordenadas repetidas en name', () => {
    expect(
      formatearUbicacionGeocodificada({
        barrio: 'Caballito',
        ciudad: 'Buenos Aires',
        calle: 'Av. Rivadavia',
        altura: '4850',
      })
    ).toBe('Caballito, Av. Rivadavia 4850');

    expect(
      formatearUbicacionGeocodificada({
        barrio: 'Almagro',
        nombre: '-34.6112, -58.4201',
      })
    ).toBe('Almagro');

    expect(
      formatearUbicacionGeocodificada({
        ciudad: 'Buenos Aires',
        nombre: 'Buenos Aires',
      })
    ).toBe('Buenos Aires');
  });
});
