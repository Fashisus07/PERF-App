-- PERF-App: multi-especie (detalle de "Otro"), tests virales fijos por especie,
-- autor visible del rescate y fotos de perfil de voluntarios.
-- Se ejecuta UNA vez en Supabase (idempotente y no destructivo).

-- ─────────────────────────────────────────────────────────────
-- 1) Columnas nuevas en `perfiles` y `casos`
-- ─────────────────────────────────────────────────────────────
alter table public.perfiles
  add column if not exists foto_url text;

alter table public.casos
  add column if not exists especie_detalle text,
  add column if not exists creado_por_nombre text;

update public.casos c
set creado_por_nombre = p.nombre
from public.perfiles p
where c.creado_por_nombre is null
  and p.id = coalesce(c.creado_por_user_id, c.creado_por)
  and btrim(p.nombre) <> '';

-- ─────────────────────────────────────────────────────────────
-- 2) Bucket privado `avatares` para fotos de perfil
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists avatares_storage_ver on storage.objects;
create policy avatares_storage_ver on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatares'
    and (public.es_voluntario_activo() or auth.uid()::text = (storage.foldername(name))[1])
  );

drop policy if exists avatares_storage_subir on storage.objects;
create policy avatares_storage_subir on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatares'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.es_coordinador())
  );

drop policy if exists avatares_storage_actualizar on storage.objects;
create policy avatares_storage_actualizar on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatares'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.es_coordinador())
  )
  with check (
    bucket_id = 'avatares'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.es_coordinador())
  );

drop policy if exists avatares_storage_borrar on storage.objects;
create policy avatares_storage_borrar on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatares'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.es_coordinador())
  );

-- ─────────────────────────────────────────────────────────────
-- 3) Catálogo fijo `tests_virales` y registros `resultados_tests_animal`
-- ─────────────────────────────────────────────────────────────
create table if not exists public.tests_virales (
  id         text primary key,
  nombre     text not null,
  especie    text not null check (especie in ('Gato', 'Perro', 'Otro')),
  orden      integer not null default 0,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.tests_virales enable row level security;

drop policy if exists tests_virales_ver on public.tests_virales;
create policy tests_virales_ver on public.tests_virales
  for select to authenticated using (public.es_voluntario_activo());

drop policy if exists tests_virales_administrar on public.tests_virales;
create policy tests_virales_administrar on public.tests_virales
  for all to authenticated
  using (public.es_coordinador()) with check (public.es_coordinador());

grant select, insert, update, delete on public.tests_virales to authenticated;

insert into public.tests_virales (id, nombre, especie, orden)
values
  ('vif', 'VIF (Inmunodeficiencia felina)', 'Gato', 1),
  ('vilef', 'ViLeF (Leucemia felina)', 'Gato', 2),
  ('parvo', 'Parvovirus canino', 'Perro', 1),
  ('moquillo', 'Moquillo / Distemper', 'Perro', 2),
  ('control_clinico', 'Control clínico / estudios generales', 'Otro', 1)
on conflict (id) do update
set nombre = excluded.nombre,
    especie = excluded.especie,
    orden = excluded.orden;

create table if not exists public.resultados_tests_animal (
  id             uuid primary key,
  caso_id        uuid not null references public.casos (id) on delete cascade,
  animal_id      uuid references public.animales (id) on delete set null,
  test_id        text not null references public.tests_virales (id) on delete restrict,
  resultado      text not null default 'PENDIENTE'
                 check (resultado in ('PENDIENTE', 'NEGATIVO', 'POSITIVO', 'NO_APLICA')),
  fecha_test     timestamptz,
  observaciones  text,
  registrado_por uuid references auth.users (id) on delete set null,
  updated_at     timestamptz not null default now()
);

create index if not exists resultados_tests_caso_idx
  on public.resultados_tests_animal (caso_id);
create unique index if not exists resultados_tests_caso_test_sin_animal_uidx
  on public.resultados_tests_animal (caso_id, test_id) where animal_id is null;
create unique index if not exists resultados_tests_caso_animal_test_uidx
  on public.resultados_tests_animal (caso_id, animal_id, test_id) where animal_id is not null;

alter table public.resultados_tests_animal enable row level security;

drop policy if exists resultados_tests_ver on public.resultados_tests_animal;
create policy resultados_tests_ver on public.resultados_tests_animal
  for select to authenticated using (public.es_voluntario_activo());

drop policy if exists resultados_tests_crear on public.resultados_tests_animal;
create policy resultados_tests_crear on public.resultados_tests_animal
  for insert to authenticated with check (public.es_voluntario_activo());

drop policy if exists resultados_tests_actualizar on public.resultados_tests_animal;
create policy resultados_tests_actualizar on public.resultados_tests_animal
  for update to authenticated
  using (public.es_voluntario_activo()) with check (public.es_voluntario_activo());

drop policy if exists resultados_tests_borrar on public.resultados_tests_animal;
create policy resultados_tests_borrar on public.resultados_tests_animal
  for delete to authenticated using (public.es_coordinador());

grant select, insert, update, delete on public.resultados_tests_animal to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4) aplicar_cambios_caso(): agrega `especie_detalle` y `creado_por_nombre`
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
    'nombre_provisorio', 'cantidad_animales', 'especie', 'especie_detalle', 'edad_estimada', 'historia_origen',
    'personalidad', 'estado_visible', 'barrio', 'latitud', 'longitud', 'quien_sigue_caso',
    'transito_nombre', 'transito_telefono', 'transito_correo', 'castrado', 'virales_vif_vilef',
    'fecha_primera_desparasitacion', 'fecha_segunda_desparasitacion', 'estado_caso',
    'gravedad_clinica', 'vulnerabilidad', 'nivel_prioridad', 'motivo_urgencia', 'puntaje_prioridad',
    'foto_remote_path', 'coordinador_id', 'creado_por_nombre'
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

notify pgrst, 'reload schema';
