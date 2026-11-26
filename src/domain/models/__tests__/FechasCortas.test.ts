import { formatoFechaCorta, formatoFechaHoraCorta } from '../Rescate';

describe('Fechas cortas (no dependen del idioma del celular)', () => {
  const fecha = new Date(2026, 10, 23, 5, 7); // 23/11/2026 05:07 hora local

  test('dd/mm/aa', () => {
    expect(formatoFechaCorta(fecha)).toBe('23/11/26');
  });

  test('con hora: dd/mm/aa hh:mm con ceros a la izquierda', () => {
    expect(formatoFechaHoraCorta(fecha)).toBe('23/11/26 05:07');
  });

  test('acepta milisegundos y texto ISO', () => {
    expect(formatoFechaCorta(fecha.getTime())).toBe('23/11/26');
    expect(formatoFechaCorta(new Date(2026, 0, 5).toISOString())).toBe('05/01/26');
  });
});
