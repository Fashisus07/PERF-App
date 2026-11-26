// Genera supabase/schema.sql a partir de las migraciones: así hay UNA sola fuente de verdad.
//
//   node supabase/generar-schema.js
//
// Las migraciones (supabase/migrations) son lo que se aplicó en la base real, en orden. `schema.sql`
// es esas mismas migraciones pegadas una detrás de otra, para armar un proyecto VACÍO de una vez.
// No se edita a mano: se cambia o se agrega una migración y se vuelve a correr este script. Un test
// (src/__tests__/SchemaSupabase.test.ts) falla si schema.sql no coincide con lo que genera.

const fs = require('node:fs');
const path = require('node:path');

const DIR_MIGRACIONES = path.join(__dirname, 'migrations');
const ARCHIVO_SCHEMA = path.join(__dirname, 'schema.sql');

const ENCABEZADO = `-- =============================================================================
-- PERF Móvil: esquema completo de Supabase (PostgreSQL)
--
-- ARCHIVO GENERADO. NO SE EDITA A MANO.
-- Es la suma, en orden, de supabase/migrations/*.sql. Para cambiar el esquema se agrega una
-- migración nueva y se corre:  node supabase/generar-schema.js
--
-- Cuándo usarlo: en un proyecto de Supabase VACÍO (pegarlo entero en el SQL Editor).
-- En un proyecto que ya tiene datos NO se usa: se aplican solo las migraciones que falten.
-- =============================================================================
`;

function leerMigraciones() {
  return fs
    .readdirSync(DIR_MIGRACIONES)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((nombre) => ({
      nombre,
      sql: fs.readFileSync(path.join(DIR_MIGRACIONES, nombre), 'utf8').replace(/\r\n/g, '\n').trimEnd(),
    }));
}

function generar() {
  const partes = leerMigraciones().map(
    (m) => `\n-- ───────────────────────────── ${m.nombre} ─────────────────────────────\n\n${m.sql}\n`
  );
  return ENCABEZADO + partes.join('');
}

module.exports = { generar, ARCHIVO_SCHEMA };

if (require.main === module) {
  fs.writeFileSync(ARCHIVO_SCHEMA, generar(), 'utf8');
  console.log(`schema.sql generado a partir de ${leerMigraciones().length} migraciones.`);
}
