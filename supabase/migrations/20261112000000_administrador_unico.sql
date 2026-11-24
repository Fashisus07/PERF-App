-- PERF-App: un único administrador; el resto de las personas son voluntarios.
--
-- En la base el rol del administrador SIGUE llamándose 'coordinador' (así lo usan es_coordinador(),
-- las políticas RLS, el panel de aprobaciones y los correos de la Etapa 2). En la app se muestra
-- como "Administrador". Esta migración solo agrega la regla de que haya UNO.
--
-- ANTES DE APLICAR (coordinar con el equipo: es la base compartida):
--  * La cuenta de coordinador MÁS ANTIGUA queda como administrador y las demás pasan a 'voluntario'.
--  * Si no hay ningún coordinador, hay que asignar el administrador a mano (ver el final).

-- 1) Si hay más de un coordinador, queda solo el más antiguo.
update public.perfiles
set rol = 'voluntario'
where rol = 'coordinador'
  and id <> (
    select id from public.perfiles
    where rol = 'coordinador'
    order by created_at asc
    limit 1
  );

-- 2) Como mucho una fila puede tener rol 'coordinador' (índice único parcial).
create unique index if not exists perfiles_un_solo_administrador
  on public.perfiles ((rol)) where rol = 'coordinador';

-- Si no había ningún coordinador para promover, asignar el administrador a mano:
--   update public.perfiles set rol = 'coordinador', aprobado = true where email = 'correo@del.admin';
