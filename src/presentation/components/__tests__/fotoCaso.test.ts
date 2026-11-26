jest.mock('../../../../assets/images/casos/canela.jpg', () => 'canela.jpg', { virtual: true });
jest.mock('../../../../assets/images/casos/luna.jpg', () => 'luna.jpg', { virtual: true });
jest.mock('../../../../assets/images/casos/misho.jpg', () => 'misho.jpg', { virtual: true });
jest.mock('../../../../assets/images/casos/oreo.jpg', () => 'oreo.jpg', { virtual: true });
jest.mock('../../../../assets/images/casos/pelusa.jpg', () => 'pelusa.jpg', { virtual: true });
jest.mock('../../../../assets/images/casos/tigre.jpg', () => 'tigre.jpg', { virtual: true });
jest.mock('../../../../assets/images/casos/mora.jpg', () => 'mora.jpg', { virtual: true });
jest.mock('../../../../assets/images/casos/kira.jpg', () => 'kira.jpg', { virtual: true });
jest.mock('../../../../assets/images/casos/toby.jpg', () => 'toby.jpg', { virtual: true });
jest.mock('../../../../assets/images/casos/coco.jpg', () => 'coco.jpg', { virtual: true });

import { fotoCasoSource } from '../fotoCaso';

describe('fotoCasoSource (fotos de ejemplo por especie)', () => {
  const FOTOS_PERROS = new Set(['mora.jpg', 'kira.jpg', 'toby.jpg', 'coco.jpg']);
  const FOTOS_GATOS = new Set(['canela.jpg', 'luna.jpg', 'misho.jpg', 'oreo.jpg', 'pelusa.jpg', 'tigre.jpg']);

  test('asigna fotos de perros cuando la especie es Perro', () => {
    for (let i = 0; i < 15; i++) {
      const src = fotoCasoSource({ id: `perro-${i}`, especie: 'Perro' });
      expect(FOTOS_PERROS.has(src as string)).toBe(true);
    }
  });

  test('asigna fotos de gatos cuando la especie es Gato', () => {
    for (let i = 0; i < 15; i++) {
      const src = fotoCasoSource({ id: `gato-${i}`, especie: 'Gato' });
      expect(FOTOS_GATOS.has(src as string)).toBe(true);
    }
  });

  test('prioriza la fotoUri real cuando el caso tiene foto cargada', () => {
    expect(fotoCasoSource({ id: 'p1', especie: 'Perro', fotoUri: 'file:///tmp/mi_foto.jpg' })).toEqual({
      uri: 'file:///tmp/mi_foto.jpg',
    });
  });
});
