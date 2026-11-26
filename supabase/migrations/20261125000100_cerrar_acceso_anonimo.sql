-- PERF-App: cierra el acceso anónimo (rol `anon`) a las tablas.
-- Se pega UNA vez en el SQL Editor de Supabase. Es idempotente y NO borra datos.
--
-- Por qué: Supabase le da por defecto al rol `anon` permisos sobre toda tabla nueva de `public`.
-- Hoy las filas ya están protegidas porque las políticas RLS de animales, pendientes y adopciones
-- son `to authenticated`, pero un solo error en una política dejaría la tabla abierta a cualquiera
-- que tenga la clave publishable (que viaja dentro de la app). Sacar el permiso de tabla es una
-- segunda barrera: aunque falle RLS, el rol anónimo no puede ni consultar la tabla.
--
-- No afecta a la app: el registro y el login usan la API de Auth, no estas tablas, y las Edge
-- Functions usan la clave de servidor.

revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;

-- Lo que se cree de acá en adelante tampoco se le da a `anon`.
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- Cómo comprobarlo (debe devolver 0 filas):
--   select table_name, privilege_type
--   from information_schema.role_table_grants
--   where grantee = 'anon' and table_schema = 'public';
