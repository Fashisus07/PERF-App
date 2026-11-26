jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  multiRemove: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'MaterialIcons' }));
jest.mock('react-native', () => ({
  Pressable: 'Pressable',
  StyleSheet: { create: (s: any) => s },
  Text: 'Text',
  TextInput: 'TextInput',
  View: 'View',
}));

import { parsearZonas, serializarZonas } from '../SelectorZonas';
import {
  formatearInputFecha,
  mediodiaLocal,
  parsearFechaExacta,
  timestampAInputFecha,
} from '../PlanDesparasitacionCard';

describe('SelectorZonas (parsearZonas y serializarZonas)', () => {
  test('elimina duplicados sin distinguir mayúsculas y conserva orden', () => {
    expect(parsearZonas('Caballito, almagro, CABALLITO,  Palermo , ')).toEqual([
      'Caballito',
      'almagro',
      'Palermo',
    ]);
  });

  test('serializarZonas limpia espacios y omite vacíos', () => {
    expect(serializarZonas(['  Boedo ', '', 'Colegiales'])).toBe('Boedo, Colegiales');
  });
});

describe('PlanDesparasitacionCard (fechas exactas de desparasitación)', () => {
  test('formatearInputFecha inserta barras DD/MM/AAAA progresivamente', () => {
    expect(formatearInputFecha('05')).toBe('05');
    expect(formatearInputFecha('0511')).toBe('05/11');
    expect(formatearInputFecha('0511202699')).toBe('05/11/2026');
  });

  test('parsearFechaExacta valida calendario real y rechaza fechas inválidas', () => {
    const ts = parsearFechaExacta('29/02/2024'); // año bisiesto válido
    expect(ts).not.toBeNull();
    expect(timestampAInputFecha(ts!)).toBe('29/02/2024');

    expect(parsearFechaExacta('29/02/2025')).toBeNull(); // no bisiesto
    expect(parsearFechaExacta('31/04/2026')).toBeNull(); // abril tiene 30
    expect(parsearFechaExacta('15/13/2026')).toBeNull();
    expect(parsearFechaExacta('15/11/1999')).toBeNull();
  });

  test('mediodiaLocal fija hora 12:00 local para evitar desfase por zona horaria', () => {
    const d = new Date(mediodiaLocal(new Date(2026, 10, 26, 23, 55)));
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(10);
    expect(d.getDate()).toBe(26);
    expect(d.getHours()).toBe(12);
  });
});
