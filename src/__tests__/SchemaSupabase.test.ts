// La configuración de jest de este proyecto no incluye los tipos de Node: se declara lo mínimo.
declare const require: (modulo: string) => any;
declare const __dirname: string;

const fs = require('node:fs');
const path = require('node:path');
const { generar, ARCHIVO_SCHEMA } = require('../../supabase/generar-schema.js') as {
  generar: () => string;
  ARCHIVO_SCHEMA: string;
};

describe('Esquema de Supabase: una sola fuente de verdad', () => {
  test('schema.sql es exactamente la suma de las migraciones (si falla: node supabase/generar-schema.js)', () => {
    const actual = fs.readFileSync(ARCHIVO_SCHEMA, 'utf8').replace(/\r\n/g, '\n');
    expect(actual).toBe(generar().replace(/\r\n/g, '\n'));
  });

  test('las migraciones tienen nombre con fecha y no se repite ninguna', () => {
    const dir = path.join(__dirname, '../../supabase/migrations');
    const nombres = fs.readdirSync(dir).filter((f: string) => f.endsWith('.sql'));
    expect(nombres.length).toBeGreaterThan(0);
    for (const n of nombres) expect(n).toMatch(/^\d{14}_[a-z0-9_]+\.sql$/);
    expect(new Set(nombres.map((n: string) => n.slice(0, 14))).size).toBe(nombres.length);
  });

  test('ninguna migración le da permisos al rol anónimo (solo se lo quitan)', () => {
    const dir = path.join(__dirname, '../../supabase/migrations');
    for (const n of fs.readdirSync(dir).filter((f: string) => f.endsWith('.sql'))) {
      const sql = fs.readFileSync(path.join(dir, n), 'utf8');
      // Se permite NOMBRAR a anon solo para quitarle permisos.
      for (const linea of sql.split('\n')) {
        if (/^\s*--/.test(linea)) continue;
        if (/\bto\b[^;]*\banon\b/i.test(linea) && /\bgrant\b/i.test(linea)) {
          throw new Error(`${n}: le da permisos a anon -> ${linea.trim()}`);
        }
      }
    }
  });
});
