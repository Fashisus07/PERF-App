// Pruebas del motor de sincronización contra un Postgres real (PGlite, en memoria), con las
// migraciones del repo aplicadas y dos "teléfonos" simulados que editan el mismo caso.
//
// Cómo correrlas (desde la raíz del repo):
//   1. npm i --no-save @electric-sql/pglite
//   2. npx tsc --ignoreConfig --strict --skipLibCheck --target es2022 --module commonjs \
//        --moduleResolution bundler --outDir .tmp-motor src/data/remote/sincronizacion/MotorSincronizacion.ts
//      echo '{"type":"commonjs"}' > .tmp-motor/package.json
//   3. node supabase/tests/motor-sincronizacion.test.mjs . .tmp-motor/data/remote/sincronizacion
//
// Los argumentos son la raíz del repo y la carpeta con el motor compilado.
// (Reemplaza auth.uid() y el esquema storage de Supabase por versiones mínimas.)
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const [repo, compilado] = process.argv.slice(2);
const motor = await import(pathToFileURL(`${compilado}/MotorSincronizacion.js`).href);
const { sincronizar, ErrorDeRed, ErrorCasoInexistente } = motor;

// ── Servidor real (Postgres con el esquema de las migraciones), como usuario autenticado ──
const db = new PGlite();
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (bucket_id text, name text);
  alter table storage.objects enable row level security;
`);
for (const f of ['20261030000000_esquema_inicial.sql', '20261031000000_animales_pendientes_adopciones.sql'])
  await db.exec(readFileSync(`${repo}/supabase/migrations/${f}`, 'utf8'));

const U1 = '00000000-0000-0000-0000-0000000000a1';
const U2 = '00000000-0000-0000-0000-0000000000a2';
for (const [id, m] of [[U1, 'u1@x.com'], [U2, 'u2@x.com']]) await db.query(`insert into auth.users (id,email) values ($1,$2)`, [id, m]);
await db.exec(`update public.perfiles set aprobado = true`);

const sqlComo = async (uid, sql, params = []) => {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${uid}',false);`);
  try { return await db.query(sql, params); }
  catch (e) { throw e; }
  finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub','',false);`); }
};
const insertar = async (uid, tabla, fila) => {
  const cols = Object.keys(fila);
  try {
    await sqlComo(uid, `insert into public.${tabla} (${cols.join(',')}) values (${cols.map((_, i) => '$' + (i + 1)).join(',')})`, Object.values(fila));
    return 'creado';
  } catch (e) { if (/duplicate key/.test(e.message)) return 'existia'; throw e; }
};

function servidorPara(uid, { conSesion = true, caeEnOperacion = null } = {}) {
  let n = 0;
  const cae = () => { if (caeEnOperacion !== null && ++n === caeEnOperacion) throw new ErrorDeRed('sin red'); };
  return {
    haySesion: async () => conSesion,
    insertarCaso: async (f) => { cae(); return insertar(uid, 'casos', f); },
    obtenerCaso: async (id) => (await sqlComo(uid, `select * from public.casos where id=$1`, [id])).rows[0] ?? null,
    aplicarCambiosCaso: async (id, cambios, ts, base) => {
      cae();
      try {
        const r = await sqlComo(uid, `select public.aplicar_cambios_caso($1,$2::jsonb,$3::jsonb,$4::timestamptz) as r`, [id, JSON.stringify(cambios), JSON.stringify(ts), base]);
        return r.rows[0].r;
      } catch (e) { if (/no existe en el servidor/.test(e.message)) throw new ErrorCasoInexistente(e.message); throw e; }
    },
    insertarEvento: async (f) => { cae(); return insertar(uid, 'eventos_historial', f); },
    insertarTurno: async (f) => { cae(); return insertar(uid, 'turnos', f); },
    marcarTurnoCumplido: async (id) => { cae(); await sqlComo(uid, `update public.turnos set cumplido=true where id=$1`, [id]); },
    borrarTurno: async (id) => { cae(); await sqlComo(uid, `delete from public.turnos where id=$1`, [id]); },
    idsCentros: async () => new Set((await sqlComo(uid, `select id from public.centros_veterinarios`)).rows.map((r) => r.id)),
    listarCasos: async () => (await sqlComo(uid, `select * from public.casos`)).rows.map(serial),
    listarEventos: async () => (await sqlComo(uid, `select * from public.eventos_historial`)).rows.map(serial),
    listarTurnos: async () => (await sqlComo(uid, `select * from public.turnos`)).rows.map(serial),
  };
}
// PGlite devuelve Date; supabase-js devuelve strings ISO.
const serial = (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v]));

// ── "Teléfono": SQLite simulada en memoria + estado propio ──
function telefono() {
  const t = { casos: new Map(), eventos: new Map(), turnos: new Map(), cola: [], seq: 0, bases: {}, ultima: null };
  t.encolar = (entidad, operacion, payload, createdAt) => t.cola.push({ id: ++t.seq, entidad, operacion, payload: JSON.stringify(payload), reintentos: 0, createdAt });
  t.almacen = {
    leerCola: async () => [...t.cola],
    quitarDeCola: async (id) => { t.cola = t.cola.filter((o) => o.id !== id); },
    registrarFallo: async (id) => { t.cola.find((o) => o.id === id).reintentos++; },
    obtenerCaso: async (id) => t.casos.get(id),
    guardarCaso: async (c) => t.casos.set(c.id, c),
    guardarEvento: async (e) => t.eventos.set(e.id, e),
    guardarTurno: async (x) => t.turnos.set(x.id, x),
    leerEventosPendientes: async () => [...t.eventos.values()].filter((e) => e.syncStatus === 'PENDING'),
    leerEventosDeCaso: async (casoId) => [...t.eventos.values()].filter((e) => e.casoId === casoId),
    marcarEventoSincronizado: async (id) => { t.eventos.get(id).syncStatus = 'SYNCED'; },
  };
  t.estado = {
    leerBases: async () => structuredClone(t.bases), guardarBases: async (b) => { t.bases = structuredClone(b); },
    leerUltimaSync: async () => t.ultima, guardarUltimaSync: async (ms) => { t.ultima = ms; },
  };
  t.sync = (uid, T, opts) => sincronizar({ servidor: servidorPara(uid, opts), almacen: t.almacen, estado: t.estado, ahora: () => T });
  return t;
}

let fallos = 0;
const ok = (n, c, extra = '') => { if (!c) fallos++; console.log(`${c ? 'OK   ' : 'FALLA'} ${n}${extra ? ' -> ' + extra : ''}`); };
const servidorCaso = async (id) => (await db.query(`select * from public.casos where id=$1`, [id])).rows[0];

const T0 = Date.now();
const CASO = '10000000-0000-0000-0000-000000000001';
const casoBase = {
  id: CASO, nombreProvisorio: 'Camada Palermo', cantidadAnimales: 2, especie: 'Gato', edadEstimada: '3 meses',
  historiaOrigen: 'Del garage', personalidad: 'Miedosos', estadoVisible: 'Bien', barrio: 'Palermo', coordenadas: null, fotoUri: null,
  fechaRescate: T0 - 86400000, quienSigueCaso: 'Cami', transito: { nombre: 'Lara', telefono: '1100', correo: 'l@x.com' },
  sanidad: { castrado: 'PENDIENTE', virales: 'PENDIENTE', fechaPrimeraDesparasitacion: null, fechaSegundaDesparasitacion: null },
  estadoCaso: 'EN_TRANSITO', esUrgente: false, syncStatus: 'PENDING', updatedAt: T0,
};
const d1 = telefono(), d2 = telefono();

// 1. D1 crea, sincroniza; D2 lo recibe
d1.casos.set(CASO, casoBase);
d1.encolar('CASO', 'CREATE', casoBase, T0);
let r = await d1.sync(U1, T0);
ok('D1 sube el caso nuevo', r.enviadas === 1 && (await servidorCaso(CASO))?.nombre_provisorio === 'Camada Palermo');
ok('la cola de D1 queda vacía', d1.cola.length === 0);
r = await d2.sync(U2, T0);
ok('D2 descarga el caso', d2.casos.get(CASO)?.barrio === 'Palermo' && r.descargadas === 1);

// 2. Ambos offline editan campos DISTINTOS (con el caso completo en la cola, como hace la app)
const editado1 = structuredClone(d1.casos.get(CASO)); editado1.sanidad.castrado = 'SI';
d1.encolar('CASO', 'UPDATE', editado1, T0 + 1000);
const editado2 = structuredClone(d2.casos.get(CASO)); editado2.transito.nombre = 'Mica';
d2.encolar('CASO', 'UPDATE', editado2, T0 + 2000);
await d1.sync(U1, T0 + 3000);
r = await d2.sync(U2, T0 + 4000);
let s = await servidorCaso(CASO);
ok('campos distintos: se conservan los DOS cambios', s.castrado === 'SI' && s.transito_nombre === 'Mica', `castrado=${s.castrado}, transito=${s.transito_nombre}`);
ok('sin conflictos cuando no tocaron lo mismo', r.conflictos.length === 0);
ok('D2 queda con el cambio de D1 después de sincronizar', d2.casos.get(CASO).sanidad.castrado === 'SI');

// 3. MISMO campo: D1 y D2 editan el barrio sin haberse visto
const b1 = structuredClone(d1.casos.get(CASO)); b1.barrio = 'Recoleta';
d1.encolar('CASO', 'UPDATE', b1, T0 + 10000);
const b2 = structuredClone(d2.casos.get(CASO)); b2.barrio = 'Belgrano';
d2.encolar('CASO', 'UPDATE', b2, T0 + 12000);
await d1.sync(U1, T0 + 13000);
r = await d2.sync(U2, T0 + 14000);
s = await servidorCaso(CASO);
const conf = (await db.query(`select campo, valor_aplicado, valor_descartado from public.conflictos`)).rows;
ok('mismo campo: gana el más reciente (Belgrano)', s.barrio === 'Belgrano');
ok('el valor perdido queda registrado, no se pierde en silencio', conf.some((c) => c.campo === 'barrio' && JSON.stringify(c.valor_descartado) === '"Recoleta"'), JSON.stringify(conf));
ok('el motor informa el conflicto', r.conflictos.includes(`${CASO}:barrio`));

// 4. Un campo viejo que no se tocó NO pisa el cambio de otro
const e1 = structuredClone(d1.casos.get(CASO)); e1.personalidad = 'Confiados';
d1.encolar('CASO', 'UPDATE', e1, T0 + 20000);
const stale = structuredClone(d2.casos.get(CASO)); stale.estadoCaso = 'EN_CLINICA'; // D2 todavía tiene la personalidad vieja
d2.encolar('CASO', 'UPDATE', stale, T0 + 30000);
await d1.sync(U1, T0 + 31000);
await d2.sync(U2, T0 + 32000);
s = await servidorCaso(CASO);
ok('campo no tocado no pisa al cambio ajeno (personalidad)', s.personalidad === 'Confiados' && s.estado_caso === 'EN_CLINICA', `personalidad=${s.personalidad}`);

// 5. Cambio parcial de estado (como cambiarEstado de la app), evento y turno
d1.encolar('CASO', 'UPDATE', { id: CASO, estadoCaso: 'EN_ADOPCION', motivo: 'listos' }, T0 + 40000);
const EV = '50000000-0000-0000-0000-000000000001', TU = '60000000-0000-0000-0000-000000000001';
d1.encolar('HISTORIAL', 'CREATE', { id: EV, casoId: CASO, tipo: 'CAMBIO_TRANSITO', fecha: T0 + 40000, descripcion: 'A adopción', syncStatus: 'PENDING' }, T0 + 40000);
d1.encolar('TURNO', 'CREATE', { id: TU, casoId: CASO, centroVeterinarioId: 'centro-local-1', fechaHora: T0 + 5e8, motivo: 'Castración', recordatorioMinutos: 120, cumplido: false, syncStatus: 'PENDING', updatedAt: T0 }, T0 + 40000);
d1.encolar('TURNO', 'UPDATE', { id: TU, cumplido: true }, T0 + 41000);
r = await d1.sync(U1, T0 + 42000);
s = await servidorCaso(CASO);
const turno = (await db.query(`select cumplido, centro_veterinario_id from public.turnos where id=$1`, [TU])).rows[0];
ok('estado parcial, evento y turno suben', r.enviadas === 4 && s.estado_caso === 'EN_ADOPCION' && turno?.cumplido === true, JSON.stringify({ enviadas: r.enviadas, fallidas: r.fallidas }));
ok('centro local desconocido va sin clave foránea (no rompe)', turno?.centro_veterinario_id === null);
d1.encolar('TURNO', 'DELETE', { id: TU }, T0 + 43000);
await d1.sync(U1, T0 + 44000);
ok('cancelar un turno lo borra en el servidor', (await db.query(`select count(*)::int n from public.turnos`)).rows[0].n === 0);

// 6. Reintento idempotente: la misma creación otra vez no duplica
d1.encolar('CASO', 'CREATE', casoBase, T0 + 50000);
r = await d1.sync(U1, T0 + 51000);
ok('reintentar una creación no duplica ni falla', r.fallidas === 0 && (await db.query(`select count(*)::int n from public.casos`)).rows[0].n === 1);

// 7. Corte de red a mitad: no se pierde nada de la cola
const d3 = telefono();
const C2 = '10000000-0000-0000-0000-000000000002', C3 = '10000000-0000-0000-0000-000000000003';
for (const [id, n] of [[C2, 'Dos'], [C3, 'Tres']]) {
  const c = { ...structuredClone(casoBase), id, nombreProvisorio: n };
  d3.casos.set(id, c); d3.encolar('CASO', 'CREATE', c, T0 + 60000);
}
let cayo = false;
try { await d3.sync(U1, T0 + 61000, { caeEnOperacion: 2 }); } catch (e) { cayo = e instanceof ErrorDeRed; }
ok('con red caída la sincronización corta', cayo);
ok('queda en cola solo lo que no se subió (1 de 2)', d3.cola.length === 1 && JSON.parse(d3.cola[0].payload).id === C3);
await d3.sync(U1, T0 + 62000);
ok('al volver la red se completa', d3.cola.length === 0 && (await db.query(`select count(*)::int n from public.casos`)).rows[0].n === 3);

// 8. Sin sesión
let sinSesion = false;
try { await d3.sync(U1, T0, { conSesion: false }); } catch (e) { sinSesion = /sesión/.test(e.message); }
ok('sin sesión avisa y no toca la cola', sinSesion);

// 9. Operación imposible no bloquea al resto
const d4 = telefono();
d4.encolar('CASO', 'UPDATE', { id: '99999999-9999-9999-9999-999999999999', estadoCaso: 'ADOPTADO' }, T0 + 70000);
const C4 = '10000000-0000-0000-0000-000000000004';
const c4 = { ...structuredClone(casoBase), id: C4 };
d4.casos.set(C4, c4); d4.encolar('CASO', 'CREATE', c4, T0 + 70001);
r = await d4.sync(U1, T0 + 71000);
ok('una operación inválida queda en cola con reintento y las demás suben', r.fallidas === 1 && r.enviadas === 1 && d4.cola.length === 1 && d4.cola[0].reintentos === 1);

// 10. Eventos guardados localmente SIN encolar (llegada del caso, cambio de estado): se suben igual
const d5 = telefono();
const C5 = '10000000-0000-0000-0000-000000000005';
const c5 = { ...structuredClone(casoBase), id: C5, nombreProvisorio: 'Con evento' };
d5.casos.set(C5, c5); d5.encolar('CASO', 'CREATE', c5, T0 + 80000); // solo el caso va a la cola
const EV_LLEGADA = '50000000-0000-0000-0000-000000000005';
d5.eventos.set(EV_LLEGADA, { id: EV_LLEGADA, casoId: C5, tipo: 'LLEGADA', fecha: T0 + 80000, descripcion: 'Llegada', syncStatus: 'PENDING' });
const EV_HUERFANO = '50000000-0000-0000-0000-000000000006'; // caso que no existe en el servidor (ej. de demostración)
d5.eventos.set(EV_HUERFANO, { id: EV_HUERFANO, casoId: '77777777-7777-7777-7777-777777777777', tipo: 'LLEGADA', fecha: T0, descripcion: 'x', syncStatus: 'PENDING' });
r = await d5.sync(U1, T0 + 81000);
const evs = (await db.query(`select id from public.eventos_historial where caso_id=$1`, [C5])).rows;
ok('el evento de llegada sube aunque no esté en la cola', evs.length === 1 && d5.eventos.get(EV_LLEGADA).syncStatus === 'SYNCED' && r.eventos === 1);
ok('un evento sin caso en el servidor falla sin romper el resto', r.fallidas === 1 && d5.eventos.get(EV_HUERFANO).syncStatus === 'PENDING');
r = await d5.sync(U1, T0 + 82000);
ok('no se vuelve a subir el que ya subió', r.eventos === 0 && (await db.query(`select count(*)::int n from public.eventos_historial where caso_id=$1`, [C5])).rows[0].n === 1);

// 11. Con señal la app guarda caso y evento como SYNCED sin enviarlos: igual tienen que subir con la creación
const d6 = telefono();
const C6 = '10000000-0000-0000-0000-000000000006';
const c6 = { ...structuredClone(casoBase), id: C6, nombreProvisorio: 'Creado con señal', syncStatus: 'SYNCED' };
d6.casos.set(C6, c6); d6.encolar('CASO', 'CREATE', c6, T0 + 90000);
const EV6 = '50000000-0000-0000-0000-000000000007';
d6.eventos.set(EV6, { id: EV6, casoId: C6, tipo: 'LLEGADA', fecha: T0 + 90000, descripcion: 'Llegada', syncStatus: 'SYNCED' });
r = await d6.sync(U1, T0 + 91000);
ok('evento marcado SYNCED (creado con señal) sube con su caso', (await db.query(`select count(*)::int n from public.eventos_historial where caso_id=$1`, [C6])).rows[0].n === 1 && r.fallidas === 0);
d6.encolar('CASO', 'CREATE', c6, T0 + 92000);
r = await d6.sync(U1, T0 + 93000);
ok('reenviar la creación no duplica el evento', r.fallidas === 0 && (await db.query(`select count(*)::int n from public.eventos_historial where caso_id=$1`, [C6])).rows[0].n === 1);

console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLA(S)`);
process.exit(fallos === 0 ? 0 : 1);

