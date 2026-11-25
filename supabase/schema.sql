-- =============================================================================
-- PERF Móvil: Esquema Integral de Infraestructura y Seguridad (Supabase / PostgreSQL)
-- Cumple requerimientos Etapa 2: Clean Architecture, Offline First, RLS, Storage y Delta Merge
-- =============================================================================

-- Extensiones necesarias
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Perfiles de Voluntarios (Mapeo 1:1 con auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.perfiles (
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

-- Funciones de validación de rol y sesión
create or replace function public.es_voluntario_activo() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and aprobado = true
  );
$$;

create or replace function public.es_coordinador() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and aprobado = true and rol = 'coordinador'
  );
$$;

-- Trigger para auto-crear perfil al registrarse en auth.users
create or replace function public.crear_perfil_al_registrarse() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_recursos text[] := '{}';
begin
  if jsonb_typeof(new.raw_user_meta_data -> 'recursos') = 'array' then
    select coalesce(array_agg(r), '{}') into v_recursos
    from jsonb_array_elements_text(new.raw_user_meta_data -> 'recursos') as r;
  end if;

  insert into public.perfiles (id, nombre, email, telefono, brigada, zona, recursos)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', 'Voluntario'),
    new.email,
    new.raw_user_meta_data ->> 'telefono',
    coalesce(new.raw_user_meta_data ->> 'brigada', 'Brigada General'),
    new.raw_user_meta_data ->> 'zona',
    v_recursos
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_al_registrarse();

-- Protección de roles y aprobación (solo un coordinador puede aprobar)
create or replace function public.proteger_rol_y_aprobacion() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.es_coordinador()
     and (new.rol is distinct from old.rol or new.aprobado is distinct from old.aprobado) then
    raise exception 'Solo un coordinador de PERF puede cambiar el rol o la aprobación.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_perfil on public.perfiles;
create trigger proteger_perfil
  before update on public.perfiles
  for each row execute function public.proteger_rol_y_aprobacion();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Casos de Rescate Animal (Offline First con Trazabilidad y Multicriterio)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.casos (
  id                            uuid primary key, -- UUID v4 generado por el cliente
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
  foto_remote_path              text,
  fecha_rescate                 timestamptz not null,
  quien_sigue_caso              text,
  transito_nombre               text,
  transito_telefono             text,
  transito_correo               text,
  castrado                      text not null default 'PENDIENTE' check (castrado in ('SI', 'NO', 'PENDIENTE')),
  virales_vif_vilef             text not null default 'PENDIENTE'
                                check (virales_vif_vilef in ('PENDIENTE', 'NEGATIVO', 'VIF_POSITIVO', 'VILEF_POSITIVO', 'AMBOS_POSITIVOS')),
  fecha_primera_desparasitacion timestamptz,
  fecha_segunda_desparasitacion timestamptz,
  estado_caso                   text not null default 'EN_TRANSITO'
                                check (estado_caso in ('EN_TRANSITO', 'EN_CLINICA', 'EN_ADOPCION', 'PRE_ADOPTADO', 'ADOPTADO', 'FALLECIDO')),
  gravedad_clinica              text not null default 'MODERADA' check (gravedad_clinica in ('CRITICA', 'MODERADA', 'LEVE', 'SANA')),
  vulnerabilidad                text not null default 'ESTABLE' check (vulnerabilidad in ('LACTANTE_SIN_MADRE', 'SIN_TRANSITO', 'EN_TRATAMIENTO', 'ESTABLE')),
  nivel_prioridad               text not null default 'ATENCION' check (nivel_prioridad in ('URGENTE', 'ATENCION', 'AL_DIA')),
  motivo_urgencia               text,
  puntaje_prioridad             integer not null default 0,
  campos_ts                     jsonb not null default '{}'::jsonb, -- Timestamps de cada campo modificado
  creado_por_user_id            uuid not null default auth.uid() references auth.users(id),
  modificado_por_user_id        uuid references auth.users(id),
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

create index if not exists casos_estado_idx on public.casos (estado_caso);
create index if not exists casos_prioridad_idx on public.casos (puntaje_prioridad desc);
create index if not exists casos_updated_idx on public.casos (updated_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Centros Veterinarios y Turnos (Inmutables / Append-Only)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.centros_veterinarios (
  id         uuid primary key,
  nombre     text not null,
  medico     text,
  barrio     text not null,
  direccion  text not null,
  telefono   text not null,
  detalle    text,
  distancia  text,
  abierto    boolean not null default true,
  tipo       text not null check (tipo in ('consultorio', 'hospital', 'quirurgico')),
  horarios   text[] not null default array['09:00', '10:30', '11:15', '12:15', '16:00', '18:30']
);

create table if not exists public.turnos (
  id                     uuid primary key, -- UUID v4 generado en el dispositivo
  caso_id                uuid not null references public.casos (id) on delete cascade,
  centro_veterinario_id  uuid references public.centros_veterinarios (id),
  fecha_hora             timestamptz not null,
  motivo                 text not null,
  recordatorio_minutos   integer not null default 120,
  cumplido               boolean not null default false,
  notification_id        text, -- Identificador local de expo-notifications
  creado_por             uuid not null default auth.uid() references auth.users (id),
  updated_at             timestamptz not null default now()
);

create index if not exists turnos_caso_idx on public.turnos (caso_id);
create index if not exists turnos_fecha_idx on public.turnos (fecha_hora);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Historial del Caso (Inmutable / Append-Only)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.eventos_historial (
  id           uuid primary key, -- UUID v4 generado en cliente
  caso_id      uuid not null references public.casos (id) on delete cascade,
  tipo         text not null,
  fecha        timestamptz not null,
  descripcion  text not null,
  autor        uuid not null default auth.uid() references auth.users (id),
  created_at   timestamptz not null default now()
);

create index if not exists eventos_caso_idx on public.eventos_historial (caso_id, fecha);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Tabla de Conflictos Detectados (Trazabilidad sin Pérdida de Datos)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.conflictos (
  id                bigint generated always as identity primary key,
  caso_id           uuid not null references public.casos (id) on delete cascade,
  campo             text not null,
  valor_aplicado    jsonb,
  valor_descartado  jsonb,
  autor_descartado  uuid references auth.users (id),
  detectado_en      timestamptz not null default now(),
  resuelto          boolean not null default false
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Fotografías en Storage y Registro de Metadatos
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.fotos_caso (
  id          uuid primary key,
  caso_id     uuid not null references public.casos (id) on delete cascade,
  ruta        text not null unique, -- formato: 'caso_id/uuid.jpg'
  principal   boolean not null default true,
  subida_por  uuid not null default auth.uid() references auth.users (id),
  created_at  timestamptz not null default now()
);

create index if not exists fotos_caso_idx on public.fotos_caso (caso_id);

-- Creación del Bucket privado casos-fotos en Supabase Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('casos-fotos', 'casos-fotos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Procedimiento de Fusión Campo a Campo (Delta Merge)
-- ─────────────────────────────────────────────────────────────────────────────
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

  -- Regla de cierre definitivo: si el caso ya fue ADOPTADO o FALLECIDO, se bloquean ediciones desfasadas
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

    -- Detección de conflicto si otro voluntario editó después de la base local
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Seguridad y Row Level Security (RLS) Estricto
-- ─────────────────────────────────────────────────────────────────────────────

-- Habilitar RLS en todas las tablas
alter table public.perfiles enable row level security;
alter table public.casos enable row level security;
alter table public.centros_veterinarios enable row level security;
alter table public.turnos enable row level security;
alter table public.eventos_historial enable row level security;
alter table public.conflictos enable row level security;
alter table public.fotos_caso enable row level security;

-- Revocar todo acceso anónimo (rol anon bloqueado totalmente)
revoke all on schema public from anon;
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;

-- Otorgar uso a usuarios autenticados
grant usage on schema public to authenticated;
grant select, update on public.perfiles to authenticated;
grant select, insert, update on public.casos to authenticated;
grant select, insert, update, delete on public.centros_veterinarios to authenticated;
grant select, insert, update, delete on public.turnos to authenticated;
grant select, insert on public.eventos_historial to authenticated;
grant select, insert, update on public.conflictos to authenticated;
grant select, insert on public.fotos_caso to authenticated;
grant execute on function public.aplicar_cambios_caso(uuid, jsonb, jsonb, timestamptz) to authenticated;

-- Políticas RLS: perfiles
create policy perfiles_ver_propio on public.perfiles
  for select to authenticated using (id = auth.uid() or public.es_voluntario_activo() or public.es_coordinador());

create policy perfiles_editar_propio on public.perfiles
  for update to authenticated using (id = auth.uid() or public.es_coordinador()) with check (id = auth.uid() or public.es_coordinador());

-- ─────────────────────────────────────────────────────────────────────────────
-- Funciones RPC para Coordinación y Aprobación de Voluntarios
-- ─────────────────────────────────────────────────────────────────────────────

-- Aprueba a un voluntario (habilitado para coordinadores o vía service role)
create or replace function public.aprobar_voluntario(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_perfil record;
begin
  if auth.uid() is not null and not public.es_coordinador() then
    raise exception 'Solo un coordinador de PERF puede aprobar postulaciones.' using errcode = '42501';
  end if;

  update public.perfiles
  set aprobado = true
  where id = p_user_id
  returning * into v_perfil;

  if v_perfil.id is null then
    return jsonb_build_object('success', false, 'error', 'Voluntario no encontrado');
  end if;

  return jsonb_build_object('success', true, 'nombre', v_perfil.nombre, 'email', v_perfil.email);
end;
$$;

-- Rechaza a un postulante y elimina toda su información de auth.users y perfiles
create or replace function public.rechazar_voluntario(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_perfil record;
begin
  if auth.uid() is not null and not public.es_coordinador() then
    raise exception 'Solo un coordinador de PERF puede rechazar y eliminar postulaciones.' using errcode = '42501';
  end if;

  select * into v_perfil from public.perfiles where id = p_user_id;

  -- 1. Eliminar de auth.users (cascada on delete cascade a public.perfiles)
  delete from auth.users where id = p_user_id;
  -- 2. Asegurar eliminación en perfiles
  delete from public.perfiles where id = p_user_id;

  return jsonb_build_object('success', true, 'nombre', coalesce(v_perfil.nombre, 'Voluntario'), 'email', coalesce(v_perfil.email, ''));
end;
$$;

grant execute on function public.aprobar_voluntario(uuid) to authenticated;
grant execute on function public.rechazar_voluntario(uuid) to authenticated;


-- Políticas RLS: casos
create policy casos_ver on public.casos
  for select to authenticated using (public.es_voluntario_activo());

create policy casos_crear on public.casos
  for insert to authenticated with check (public.es_voluntario_activo() and creado_por_user_id = auth.uid());

create policy casos_actualizar on public.casos
  for update to authenticated using (public.es_voluntario_activo()) with check (public.es_voluntario_activo());

-- Políticas RLS: turnos
create policy turnos_ver on public.turnos
  for select to authenticated using (public.es_voluntario_activo());

create policy turnos_crear on public.turnos
  for insert to authenticated with check (public.es_voluntario_activo() and creado_por = auth.uid());

create policy turnos_actualizar on public.turnos
  for update to authenticated using (public.es_voluntario_activo()) with check (public.es_voluntario_activo());

create policy turnos_borrar on public.turnos
  for delete to authenticated using (public.es_voluntario_activo());

-- Políticas RLS: eventos_historial
create policy eventos_ver on public.eventos_historial
  for select to authenticated using (public.es_voluntario_activo());

create policy eventos_crear on public.eventos_historial
  for insert to authenticated with check (public.es_voluntario_activo() and autor = auth.uid());

-- Políticas RLS: centros_veterinarios
create policy centros_ver on public.centros_veterinarios
  for select to authenticated using (public.es_voluntario_activo());

create policy centros_administrar on public.centros_veterinarios
  for all to authenticated using (public.es_coordinador()) with check (public.es_coordinador());

-- Políticas RLS: conflictos
create policy conflictos_ver on public.conflictos
  for select to authenticated using (public.es_voluntario_activo());

create policy conflictos_editar on public.conflictos
  for update to authenticated using (public.es_coordinador()) with check (public.es_coordinador());

-- Políticas RLS: fotos_caso
create policy fotos_ver on public.fotos_caso
  for select to authenticated using (public.es_voluntario_activo());

create policy fotos_crear on public.fotos_caso
  for insert to authenticated with check (public.es_voluntario_activo() and subida_por = auth.uid());

-- Políticas RLS: storage.objects (Bucket privado casos-fotos)
create policy fotos_storage_ver on storage.objects
  for select to authenticated using (bucket_id = 'casos-fotos' and public.es_voluntario_activo());

create policy fotos_storage_subir on storage.objects
  for insert to authenticated with check (bucket_id = 'casos-fotos' and public.es_voluntario_activo());
