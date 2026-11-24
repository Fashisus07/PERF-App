-- PERF-App: adapta la base de Tobias (proyecto kdnosvxrgoxsopmzkghh) al código de la Etapa 2 de Facu
-- (commit 50e2d0b en main: triaje multicriterio, sync bidireccional, aprobación de voluntarios).
--
-- Se pega UNA vez en el SQL Editor de Supabase. Es idempotente (se puede repetir sin romper nada)
-- y NO borra datos: solo agrega columnas, un bucket, políticas y reemplaza funciones.
--
-- Qué necesita el código de Facu que la base todavía no tenía (ver supabase/schema.sql de main):
--   * casos: gravedad_clinica, vulnerabilidad, nivel_prioridad, motivo_urgencia, puntaje_prioridad,
--            foto_remote_path, creado_por_user_id y modificado_por_user_id.
--   * turnos.notification_id y centros_veterinarios.distancia.
--   * bucket privado 'casos-fotos' (el de la base se llamaba 'fotos-casos').
--   * aplicar_cambios_caso() con los campos nuevos y la regla de casos cerrados.
--   * UPDATE sobre casos (SincronizacionFotos guarda foto_remote_path directo).
--   * aprobar_voluntario() / rechazar_voluntario() (para no depender de la clave service_role).
--
-- Se conservan la columna `gravedad` y las tablas animales / pendientes / adopciones.

-- ─────────────────────────────────────────────────────────────
-- 1) Columnas nuevas
-- ─────────────────────────────────────────────────────────────
alter table public.casos
  add column if not exists gravedad_clinica text not null default 'MODERADA',
  add column if not exists vulnerabilidad text not null default 'ESTABLE',
  add column if not exists nivel_prioridad text not null default 'ATENCION',
  add column if not exists motivo_urgencia text,
  add column if not exists puntaje_prioridad integer not null default 0,
  add column if not exists foto_remote_path text,
  add column if not exists creado_por_user_id uuid default auth.uid() references auth.users (id),
  add column if not exists modificado_por_user_id uuid references auth.users (id);

alter table public.casos drop constraint if exists casos_gravedad_clinica_check;
alter table public.casos add constraint casos_gravedad_clinica_check
  check (gravedad_clinica in ('CRITICA', 'MODERADA', 'LEVE', 'SANA'));
alter table public.casos drop constraint if exists casos_vulnerabilidad_check;
alter table public.casos add constraint casos_vulnerabilidad_check
  check (vulnerabilidad in ('LACTANTE_SIN_MADRE', 'SIN_TRANSITO', 'EN_TRATAMIENTO', 'ESTABLE'));
alter table public.casos drop constraint if exists casos_nivel_prioridad_check;
alter table public.casos add constraint casos_nivel_prioridad_check
  check (nivel_prioridad in ('URGENTE', 'ATENCION', 'AL_DIA'));

create index if not exists casos_estado_idx on public.casos (estado_caso);
create index if not exists casos_prioridad_idx on public.casos (puntaje_prioridad desc);
create index if not exists casos_updated_idx on public.casos (updated_at desc);

-- Los casos que ya existían: pasar la gravedad vieja a la nueva y copiar el autor.
update public.casos
set gravedad_clinica = case gravedad
      when 'critico' then 'CRITICA'
      when 'urgente' then 'MODERADA'
      else 'LEVE'
    end,
    nivel_prioridad = case gravedad
      when 'critico' then 'URGENTE'
      when 'urgente' then 'ATENCION'
      else 'AL_DIA'
    end,
    creado_por_user_id = coalesce(creado_por_user_id, creado_por)
where gravedad_clinica = 'MODERADA' and nivel_prioridad = 'ATENCION' and puntaje_prioridad = 0;

alter table public.turnos add column if not exists notification_id text;
alter table public.centros_veterinarios add column if not exists distancia text;

-- ─────────────────────────────────────────────────────────────
-- 2) Bucket de fotos que usa la app ('casos-fotos'), privado
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('casos-fotos', 'casos-fotos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists casos_fotos_storage_ver on storage.objects;
create policy casos_fotos_storage_ver on storage.objects
  for select to authenticated using (bucket_id = 'casos-fotos' and public.es_voluntario_activo());

drop policy if exists casos_fotos_storage_subir on storage.objects;
create policy casos_fotos_storage_subir on storage.objects
  for insert to authenticated with check (bucket_id = 'casos-fotos' and public.es_voluntario_activo());

-- ─────────────────────────────────────────────────────────────
-- 3) Permisos de escritura que usa el motor de sincronización
-- ─────────────────────────────────────────────────────────────
-- SincronizacionFotos guarda casos.foto_remote_path con un UPDATE directo.
-- (Los demás cambios de un caso siguen pasando por aplicar_cambios_caso().)
drop policy if exists casos_actualizar on public.casos;
create policy casos_actualizar on public.casos
  for update to authenticated
  using (public.es_voluntario_activo()) with check (public.es_voluntario_activo());

-- ─────────────────────────────────────────────────────────────
-- 4) aplicar_cambios_caso(): campos nuevos, autor del cambio y casos cerrados
-- ─────────────────────────────────────────────────────────────
create or replace function public.aplicar_cambios_caso(
  p_id uuid,
  p_cambios jsonb,
  p_campos_ts jsonb,
  p_base timestamptz
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c_editables constant text[] := array[
    'nombre_provisorio', 'cantidad_animales', 'especie', 'edad_estimada', 'historia_origen',
    'personalidad', 'estado_visible', 'barrio', 'latitud', 'longitud', 'quien_sigue_caso',
    'transito_nombre', 'transito_telefono', 'transito_correo', 'castrado', 'virales_vif_vilef',
    'fecha_primera_desparasitacion', 'fecha_segunda_desparasitacion', 'estado_caso',
    'gravedad_clinica', 'vulnerabilidad', 'nivel_prioridad', 'motivo_urgencia', 'puntaje_prioridad',
    'foto_remote_path'
  ];
  v_caso      public.casos;
  v_campo     text;
  v_ms_nuevo  bigint;
  v_ms_actual bigint;
  v_actual    jsonb;
  v_nuevo     jsonb;
  v_aplicados text[] := '{}';
  v_conflictos text[] := '{}';
begin
  if not public.es_voluntario_activo() then
    raise exception 'Acceso no autorizado: voluntario inactivo o no verificado.' using errcode = '42501';
  end if;

  select * into v_caso from public.casos where id = p_id for update;
  if not found then
    raise exception 'El caso % no existe en el servidor.', p_id using errcode = 'P0002';
  end if;

  -- Un caso ADOPTADO o FALLECIDO ya está cerrado: se bloquean las ediciones desfasadas.
  if v_caso.estado_caso in ('ADOPTADO', 'FALLECIDO') and (v_caso.updated_at > p_base) then
    raise exception 'El caso % está cerrado definitivamente como %.', p_id, v_caso.estado_caso using errcode = '42501';
  end if;

  foreach v_campo in array c_editables loop
    continue when not (p_cambios ? v_campo);

    v_nuevo     := p_cambios -> v_campo;
    v_actual    := to_jsonb(v_caso) -> v_campo;
    v_ms_nuevo  := coalesce((p_campos_ts ->> v_campo)::bigint, (extract(epoch from now()) * 1000)::bigint);
    v_ms_actual := coalesce((v_caso.campos_ts ->> v_campo)::bigint, 0);

    continue when v_actual is not distinct from v_nuevo;

    -- Otro voluntario editó este campo después de la última sincronización de este teléfono.
    if v_ms_actual > (extract(epoch from p_base) * 1000)::bigint then
      v_conflictos := v_conflictos || v_campo;
      insert into public.conflictos (caso_id, campo, valor_aplicado, valor_descartado, autor_descartado)
      values (
        p_id, v_campo,
        case when v_ms_nuevo > v_ms_actual then v_nuevo else v_actual end,
        case when v_ms_nuevo > v_ms_actual then v_actual else v_nuevo end,
        auth.uid()
      );
    end if;

    if v_ms_nuevo >= v_ms_actual then
      execute format(
        'update public.casos
            set %1$I = (jsonb_populate_record(null::public.casos, jsonb_build_object(%1$L, $1))).%1$I,
                campos_ts = campos_ts || jsonb_build_object(%1$L, $2),
                modificado_por_user_id = $4,
                updated_at = now()
          where id = $3',
        v_campo
      ) using v_nuevo, v_ms_nuevo, p_id, auth.uid();
      v_aplicados := v_aplicados || v_campo;
    end if;
  end loop;

  return jsonb_build_object('aplicados', v_aplicados, 'conflictos', v_conflictos);
end;
$$;

grant execute on function public.aplicar_cambios_caso(uuid, jsonb, jsonb, timestamptz) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5) Aprobar / rechazar voluntarios desde la app SIN la clave service_role
-- ─────────────────────────────────────────────────────────────
create or replace function public.aprobar_voluntario(p_user_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare
  v_perfil record;
begin
  if auth.uid() is not null and not public.es_coordinador() then
    raise exception 'Solo el administrador de PERF puede aprobar postulaciones.' using errcode = '42501';
  end if;

  update public.perfiles set aprobado = true where id = p_user_id returning * into v_perfil;
  if v_perfil.id is null then
    return jsonb_build_object('success', false, 'error', 'Voluntario no encontrado');
  end if;
  return jsonb_build_object('success', true, 'nombre', v_perfil.nombre, 'email', v_perfil.email);
end;
$$;

create or replace function public.rechazar_voluntario(p_user_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare
  v_perfil record;
begin
  if auth.uid() is not null and not public.es_coordinador() then
    raise exception 'Solo el administrador de PERF puede rechazar postulaciones.' using errcode = '42501';
  end if;

  select * into v_perfil from public.perfiles where id = p_user_id;
  delete from auth.users where id = p_user_id;      -- borra también el perfil (on delete cascade)
  delete from public.perfiles where id = p_user_id;
  return jsonb_build_object('success', true, 'nombre', coalesce(v_perfil.nombre, 'Voluntario'),
                            'email', coalesce(v_perfil.email, ''));
end;
$$;

grant execute on function public.aprobar_voluntario(uuid) to authenticated;
grant execute on function public.rechazar_voluntario(uuid) to authenticated;

-- Que la API (PostgREST) vea las columnas y funciones nuevas sin esperar.
notify pgrst, 'reload schema';
