jest.mock('react-native', () => ({ Linking: { openURL: jest.fn(() => Promise.resolve()) } }));

import { urlWhatsApp } from '../contacto';

describe('Link de WhatsApp', () => {
  test('un celular sin prefijo de país lleva 549', () => {
    expect(urlWhatsApp('11 5555-1234')).toBe('https://wa.me/5491155551234');
  });

  test('saca el 0 inicial del código de área', () => {
    expect(urlWhatsApp('011 5555 1234')).toBe('https://wa.me/5491155551234');
  });

  test('si ya viene con 54 no se repite', () => {
    expect(urlWhatsApp('+54 9 11 5555-1234')).toBe('https://wa.me/5491155551234');
  });

  test('sin teléfono o sin dígitos no hay link', () => {
    expect(urlWhatsApp('')).toBeNull();
    expect(urlWhatsApp(undefined)).toBeNull();
    expect(urlWhatsApp('sin teléfono')).toBeNull();
  });

  test('el mensaje va codificado', () => {
    expect(urlWhatsApp('1155551234', 'Hola, ¿cómo estás?')).toBe(
      'https://wa.me/5491155551234?text=Hola%2C%20%C2%BFc%C3%B3mo%20est%C3%A1s%3F'
    );
  });
});
