const memStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => memStorage.get(k) ?? null),
  setItem: jest.fn(async (k: string, v: string) => {
    memStorage.set(k, v);
  }),
  removeItem: jest.fn(async (k: string) => {
    memStorage.delete(k);
  }),
  multiRemove: jest.fn(async (keys: string[]) => {
    keys.forEach((k) => memStorage.delete(k));
  }),
}));

import {
  activarModoDemo,
  esModoDemo,
  purgarDatosDemoDeDb,
  resetCacheModoDemoParaTest,
} from '../ModoDemo';

describe('ModoDemo (arranque limpio en modo real y limpieza al salir de demo)', () => {
  beforeEach(() => {
    memStorage.clear();
    resetCacheModoDemoParaTest();
  });

  test('arranca desactivado por defecto para que el modo real inicie vacío', async () => {
    expect(await esModoDemo()).toBe(false);
  });

  test('activarModoDemo(true) habilita demo y activarModoDemo(false) lo apaga', async () => {
    await activarModoDemo(true);
    expect(await esModoDemo()).toBe(true);

    await activarModoDemo(false);
    expect(await esModoDemo()).toBe(false);
  });

  test('purgarDatosDemoDeDb elimina únicamente registros mock y limpia bandera de siembra', async () => {
    const calls: string[] = [];
    const fakeDb: any = {
      runAsync: jest.fn(async (sql: string, params?: any[]) => {
        calls.push(`${sql} ${JSON.stringify(params ?? [])}`);
        return { changes: 1 };
      }),
    };

    await purgarDatosDemoDeDb(fakeDb, ['10000000-0000-4000-8000-000000000001'], ['patitas']);
    expect(calls.some((c) => c.includes('DELETE FROM casos WHERE id = ?') && c.includes('10000000'))).toBe(true);
    expect(calls.some((c) => c.includes('DELETE FROM centros_veterinarios WHERE id = ?') && c.includes('patitas'))).toBe(true);
  });
});
