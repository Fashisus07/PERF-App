-- PERF-App: esquema inicial de Supabase (PostgreSQL).
--
-- Decisiones de diseño (responden a la devolución de la preentrega):
--  * Acceso: solo voluntarios APROBADOS por un coordinador ven casos, fotos y ubicaciones (RLS).
--  * Duplicados: los ids (uuid) los genera el cliente, así reintentar un envío no crea otro registro.
--  * Conflictos: el caso se fusiona CAMPO A CAMPO (no se pisa la fila entera) y, si dos voluntarios
--    cambiaron el mismo campo, el valor perdedor queda guardado en `conflictos` (no se pierde nada).
--  * Historial: tabla de solo-agregar (no se edita ni se borra), así nunca hay conflicto.
--  * Fotos: bucket privado en Storage; cada foto tiene ruta única, así tampoco hay conflicto.

-- ─────────────────────────────────────────────────────────────
-- Perfiles de voluntarios (1 a 1 con auth.users)
-- ─────────────────────────────────────────────────────────────
create table public.perfiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nombre      text not null,
  email       text not null,
  telefono    text,
  brigada     text not null default '',
  zona        text,
  recursos    text[] not null default '{}',
  rol         text not null default 'voluntario' check (rol in ('voluntario', 'coordinador')),
  aprobado    boolean not null default false,
  created_at  timestamptz not null default now()
);

create function public.es_voluntario_activo() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and aprobado);
$$;

create function public.es_coordinador() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfiles where id = auth.uid() and aprobado and rol = 'coordinador'
  );
$$;

-- Al registrarse en Supabase Auth se crea el perfil (pendiente de aprobación).
create function public.crear_perfil_al_registrarse() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, nombre, email, telefono, brigada, zona)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', ''),
    new.email,
    new.raw_user_meta_data ->> 'telefono',
    coalesce(new.raw_user_meta_data ->> 'brigada', ''),
    new.raw_user_meta_data ->> 'zona'
  );
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_al_registrarse();

-- Un voluntario no puede aprobarse a sí mismo ni cambiarse el rol (desde la API).
create function public.proteger_rol_y_aprobacion() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.es_coordinador()
     and (new.rol is distinct from old.rol or new.aprobado is distinct from old.aprobado) then
    raise exception 'Solo un coordinador puede cambiar el rol o la aprobación.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger proteger_perfil
  before update on public.perfiles
  for each row execute function public.proteger_rol_y_aprobacion();

alter table public.perfiles enable row level security;

create policy perfiles_ver_propio_o_coordinador on public.perfiles
  for select to authenticated
  using (id = auth.uid() or public.es_coordinador());

create policy perfiles_ver_voluntarios_activos on public.perfiles
  for select to authenticated
  using (public.es_voluntario_activo() and aprobado);

create policy perfiles_editar_propio on public.perfiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy perfiles_editar_coordinador on public.perfiles
  for update to authenticated
  using (public.es_coordinador()) with check (public.es_coordinador());

-- ─────────────────────────────────────────────────────────────
-- Casos
-- ─────────────────────────────────────────────────────────────
create table public.casos (
  id                            uuid primary key,              -- lo genera el cliente (sin duplicados)
  nombre_provisorio             text not null,
  cantidad_animales             integer not null default 1 check (cantidad_animales > 0),
  especie                       text not null default 'Gato' check (especie in ('Gato', 'Perro', 'Otro')),
  edad_estimada                 text,
  historia_origen               text,
  personalidad                  text,
  estado_visible                text,
  barrio                        text not null,
  latitud                       double precision,
  longitud                      double precision,
  fecha_rescate                 timestamptz not null,
  quien_sigue_caso              text,
  transito_nombre               text,
  transito_telefono             text,
  transito_correo               text,
  castrado                      text not null default 'PENDIENTE' check (castrado in ('SI', 'NO', 'PENDIENTE')),
  virales_vif_vilef             text not null default 'PENDIENTE'
                                check (virales_vif_vilef in
                                  ('PENDIENTE', 'NEGATIVO', 'VIF_POSITIVO', 'VILEF_POSITIVO', 'AMBOS_POSITIVOS')),
  fecha_primera_desparasitacion timestamptz,
  fecha_segunda_desparasitacion timestamptz,
  estado_caso                   text not null default 'EN_TRANSITO'
                                check (estado_caso in
                                  ('EN_TRANSITO', 'EN_CLINICA', 'EN_ADOPCION', 'PRE_ADOPTADO', 'ADOPTADO', 'FALLECIDO')),
  -- Gravedad clínica al ingreso. Reemplaza al flag es_urgente y a la urgencia por días.
  -- Los valores definitivos hay que validarlos con el refugio.
  gravedad                      text not null default 'estable' check (gravedad in ('critico', 'urgente', 'estable')),
  -- Último cambio (epoch ms del cliente) por campo, para fusionar sin pisar.
  campos_ts                     jsonb not null default '{}'::jsonb,
  creado_por                    uuid not null default auth.uid() references public.perfiles (id),
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

create index casos_estado_idx on public.casos (estado_caso);
create index casos_updated_idx on public.casos (updated_at);

alter table public.casos enable row level security;

create policy casos_ver on public.casos
  for select to authenticated using (public.es_voluntario_activo());

-- Alta: reintentar con el mismo id no duplica (el cliente usa upsert ignorando duplicados).
create policy casos_crear on public.casos
  for insert to authenticated
  with check (public.es_voluntario_activo() and creado_por = auth.uid());

-- No hay política de UPDATE ni DELETE: los cambios pasan por aplicar_cambios_caso().

-- ─────────────────────────────────────────────────────────────
-- Conflictos detectados (dos voluntarios cambiaron el mismo campo)
-- ─────────────────────────────────────────────────────────────
create table public.conflictos (
  id                bigint generated always as identity primary key,
  caso_id           uuid not null references public.casos (id) on delete cascade,
  campo             text not null,
  valor_aplicado    jsonb,
  valor_descartado  jsonb,
  autor_descartado  uuid references public.perfiles (id),
  detectado_en      timestamptz not null default now(),
  resuelto          boolean not null default false
);

alter table public.conflictos enable row level security;

create policy conflictos_ver on public.conflictos
  for select to authenticated using (public.es_voluntario_activo());

create policy conflictos_resolver on public.conflictos
  for update to authenticated using (public.es_coordinador()) with check (public.es_coordinador());

-- ─────────────────────────────────────────────────────────────
-- Fusión campo a campo
--   p_cambios : {"campo": valor, ...}           campos que el voluntario modificó
--   p_campos_ts: {"campo": epoch_ms, ...}        cuándo modificó cada uno
--   p_base    : última vez que ese dispositivo bajó datos del servidor
-- Regla: gana el cambio más reciente de CADA campo. Si el servidor ya tenía un cambio de otro
-- voluntario posterior a p_base, se registra en `conflictos` el valor que no se aplicó.
-- Limitación conocida: el orden depende del reloj de los teléfonos.
-- ─────────────────────────────────────────────────────────────
create function public.aplicar_cambios_caso(p_id uuid, p_cambios jsonb, p_campos_ts jsonb, p_base timestamptz)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c_editables constant text[] := array[
    'nombre_provisorio', 'cantidad_animales', 'especie', 'edad_estimada', 'historia_origen',
    'personalidad', 'estado_visible', 'barrio', 'latitud', 'longitud', 'quien_sigue_caso',
    'transito_nombre', 'transito_telefono', 'transito_correo', 'castrado', 'virales_vif_vilef',
    'fecha_primera_desparasitacion', 'fecha_segunda_desparasitacion', 'estado_caso', 'gravedad'
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
    raise exception 'No autorizado.' using errcode = '42501';
  end if;

  select * into v_caso from public.casos where id = p_id for update;
  if not found then
    raise exception 'El caso % no existe en el servidor.', p_id using errcode = 'P0002';
  end if;

  foreach v_campo in array c_editables loop
    continue when not (p_cambios ? v_campo);

    v_nuevo     := p_cambios -> v_campo;
    v_actual    := to_jsonb(v_caso) -> v_campo;
    v_ms_nuevo  := coalesce((p_campos_ts ->> v_campo)::bigint, 0);
    v_ms_actual := coalesce((v_caso.campos_ts ->> v_campo)::bigint, 0);

    continue when v_actual is not distinct from v_nuevo;

    -- ¿Otro voluntario cambió este campo después de la última sincronización de este dispositivo?
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

    if v_ms_nuevo > v_ms_actual then
      execute format(
        'update public.casos
            set %1$I = (jsonb_populate_record(null::public.casos, jsonb_build_object(%1$L, $1))).%1$I,
                campos_ts = campos_ts || jsonb_build_object(%1$L, $2),
                updated_at = now()
          where id = $3',
        v_campo
      ) using v_nuevo, v_ms_nuevo, p_id;
      v_aplicados := v_aplicados || v_campo;
    end if;
  end loop;

  return jsonb_build_object('aplicados', v_aplicados, 'conflictos', v_conflictos);
end;
$$;

revoke all on function public.aplicar_cambios_caso(uuid, jsonb, jsonb, timestamptz) from public, anon;
grant execute on function public.aplicar_cambios_caso(uuid, jsonb, jsonb, timestamptz) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Historial del caso (solo agregar)
-- ─────────────────────────────────────────────────────────────
create table public.eventos_historial (
  id           uuid primary key,                                 -- lo genera el cliente
  caso_id      uuid not null references public.casos (id) on delete cascade,
  tipo         text not null,
  fecha        timestamptz not null,
  descripcion  text not null,
  autor        uuid not null default auth.uid() references public.perfiles (id),
  created_at   timestamptz not null default now()
);

create index eventos_caso_idx on public.eventos_historial (caso_id, fecha);

alter table public.eventos_historial enable row level security;

create policy eventos_ver on public.eventos_historial
  for select to authenticated using (public.es_voluntario_activo());

create policy eventos_agregar on public.eventos_historial
  for insert to authenticated
  with check (public.es_voluntario_activo() and autor = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- Fotos (cada foto es una fila nueva con ruta única: no hay conflicto posible)
-- ─────────────────────────────────────────────────────────────
create table public.fotos_caso (
  id          uuid primary key,                                  -- lo genera el cliente
  caso_id     uuid not null references public.casos (id) on delete cascade,
  ruta        text not null unique,                              -- 'caso_id/foto_id.jpg' dentro del bucket
  principal   boolean not null default false,
  subida_por  uuid not null default auth.uid() references public.perfiles (id),
  created_at  timestamptz not null default now()
);

create index fotos_caso_idx on public.fotos_caso (caso_id);

alter table public.fotos_caso enable row level security;

create policy fotos_ver on public.fotos_caso
  for select to authenticated using (public.es_voluntario_activo());

create policy fotos_agregar on public.fotos_caso
  for insert to authenticated
  with check (public.es_voluntario_activo() and subida_por = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-casos', 'fotos-casos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy fotos_storage_ver on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos-casos' and public.es_voluntario_activo());

create policy fotos_storage_subir on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos-casos' and public.es_voluntario_activo());

-- ─────────────────────────────────────────────────────────────
-- Turnos veterinarios
-- ─────────────────────────────────────────────────────────────
create table public.centros_veterinarios (
  id         uuid primary key,
  nombre     text not null,
  medico     text,
  barrio     text not null,
  direccion  text not null,
  telefono   text not null,
  detalle    text,
  abierto    boolean not null default true,
  tipo       text not null check (tipo in ('consultorio', 'hospital', 'quirurgico')),
  horarios   text[] not null default array['09:00', '10:30', '11:15', '12:15', '16:00', '18:30']
);

alter table public.centros_veterinarios enable row level security;

create policy centros_ver on public.centros_veterinarios
  for select to authenticated using (public.es_voluntario_activo());

create policy centros_administrar on public.centros_veterinarios
  for all to authenticated
  using (public.es_coordinador()) with check (public.es_coordinador());

create table public.turnos (
  id                     uuid primary key,                       -- lo genera el cliente
  caso_id                uuid not null references public.casos (id) on delete cascade,
  centro_veterinario_id  uuid references public.centros_veterinarios (id),
  fecha_hora             timestamptz not null,
  motivo                 text not null,
  recordatorio_minutos   integer not null default 120,
  cumplido               boolean not null default false,
  creado_por             uuid not null default auth.uid() references public.perfiles (id),
  updated_at             timestamptz not null default now()
);

create index turnos_caso_idx on public.turnos (caso_id);
create index turnos_fecha_idx on public.turnos (fecha_hora);

alter table public.turnos enable row level security;

create policy turnos_ver on public.turnos
  for select to authenticated using (public.es_voluntario_activo());

create policy turnos_crear on public.turnos
  for insert to authenticated
  with check (public.es_voluntario_activo() and creado_por = auth.uid());

-- Solo se puede marcar como cumplido (el resto del turno no se edita).
create policy turnos_marcar_cumplido on public.turnos
  for update to authenticated
  using (public.es_voluntario_activo()) with check (public.es_voluntario_activo());

create function public.limitar_edicion_turno() returns trigger
language plpgsql as $$
begin
  if (new.caso_id, new.centro_veterinario_id, new.fecha_hora, new.motivo, new.recordatorio_minutos, new.creado_por)
     is distinct from
     (old.caso_id, old.centro_veterinario_id, old.fecha_hora, old.motivo, old.recordatorio_minutos, old.creado_por) then
    raise exception 'Un turno solo puede marcarse como cumplido.' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger limitar_turno
  before update on public.turnos
  for each row execute function public.limitar_edicion_turno();

-- ─────────────────────────────────────────────────────────────
-- Permisos de la Data API (solo usuarios con sesión; anon no accede a nada).
-- Las políticas RLS de arriba restringen además qué filas puede tocar cada uno.
-- ─────────────────────────────────────────────────────────────
grant usage on schema public to authenticated;

grant select, update          on public.perfiles             to authenticated;
grant select, insert          on public.casos                to authenticated;
grant select, update          on public.conflictos           to authenticated;
grant select, insert          on public.eventos_historial    to authenticated;
grant select, insert          on public.fotos_caso           to authenticated;
grant select, insert, update, delete on public.centros_veterinarios to authenticated;
grant select, insert, update  on public.turnos               to authenticated;
