-- PERF-App: un único administrador; el resto de las personas son voluntarios.
--
-- ANTES DE APLICAR (coordinar con el equipo: es la base compartida):
--  * El rol 'coordinador' desaparece. La cuenta de coordinador MÁS ANTIGUA pasa a 'administrador'
--    y las demás pasan a 'voluntario'. Si no hay ningún coordinador, hay que asignar el
--    administrador a mano (ver el final del archivo).
--  * Las políticas RLS no se tocan: siguen usando public.es_coordinador(), que ahora significa
--    "es el administrador". El nombre se mantiene para no reescribir todas las políticas.
--
-- Las zonas múltiples no necesitan cambios de esquema: la app las guarda en la columna `zona`
-- separadas por coma ("Caballito, Almagro").

-- 1) Migrar los datos al modelo nuevo.
update public.perfiles
set rol = 'voluntario'
where rol = 'coordinador'
  and id <> (
    select id from public.perfiles
    where rol = 'coordinador'
    order by created_at asc
    limit 1
  );

update public.perfiles set rol = 'administrador' where rol = 'coordinador';

-- 2) Roles permitidos y unicidad del administrador.
alter table public.perfiles drop constraint if exists perfiles_rol_check;
alter table public.perfiles
  add constraint perfiles_rol_check check (rol in ('voluntario', 'administrador'));

-- Índice único parcial: como mucho una fila puede tener rol 'administrador'.
create unique index perfiles_un_solo_administrador
  on public.perfiles ((rol)) where rol = 'administrador';

-- 3) es_coordinador() ahora significa "es el administrador aprobado".
create or replace function public.es_coordinador() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfiles where id = auth.uid() and aprobado and rol = 'administrador'
  );
$$;

-- Si no había ningún coordinador para promover, asignar el administrador a mano:
--   update public.perfiles set rol = 'administrador', aprobado = true where email = 'correo@del.admin';
