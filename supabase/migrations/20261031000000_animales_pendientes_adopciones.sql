-- Modelo por animal, pendientes y adopciones.
-- Solo agrega tablas: no modifica `casos`, así que lo existente sigue funcionando.
-- Reutiliza es_voluntario_activo() y es_coordinador() del esquema inicial.

-- ─────────────────────────────────────────────────────────────
-- Animales: un caso puede agrupar varios (camada, mamá con bebés) y la
-- sanidad es de cada uno. Valores alineados con Caso.ts.
-- ─────────────────────────────────────────────────────────────
create table public.animales (
  id                            uuid primary key,              -- lo genera el cliente
  caso_id                       uuid not null references public.casos (id) on delete cascade,
  nombre                        text not null,
  castrado                      text not null default 'PENDIENTE' check (castrado in ('SI', 'NO', 'PENDIENTE')),
  virales_vif_vilef             text not null default 'PENDIENTE'
                                check (virales_vif_vilef in
                                  ('PENDIENTE', 'NEGATIVO', 'VIF_POSITIVO', 'VILEF_POSITIVO', 'AMBOS_POSITIVOS')),
  embarazada                    boolean not null default false,
  peso_gramos                   integer check (peso_gramos is null or peso_gramos > 0),
  fecha_primera_desparasitacion timestamptz,
  fecha_segunda_desparasitacion timestamptz,
  fallecido                     boolean not null default false,
  motivo_fallecimiento          text,
  -- Último cambio (epoch ms del cliente) por campo, igual que en `casos`.
  campos_ts                     jsonb not null default '{}'::jsonb,
  creado_por                    uuid not null default auth.uid() references public.perfiles (id),
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  check (motivo_fallecimiento is null or fallecido)
);

create index animales_caso_idx on public.animales (caso_id);

alter table public.animales enable row level security;

create policy animales_ver on public.animales
  for select to authenticated using (public.es_voluntario_activo());

create policy animales_crear on public.animales
  for insert to authenticated
  with check (public.es_voluntario_activo() and creado_por = auth.uid());

create policy animales_editar on public.animales
  for update to authenticated
  using (public.es_voluntario_activo()) with check (public.es_voluntario_activo());

create function public.tocar_animal() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.creado_por := old.creado_por;
  new.caso_id := old.caso_id;
  return new;
end;
$$;

create trigger animales_tocar
  before update on public.animales
  for each row execute function public.tocar_animal();

-- ─────────────────────────────────────────────────────────────
-- Pendientes: lo que falta hacer (castrar, estudio, cirugía, especialista).
-- Alimentan la prioridad del caso.
-- ─────────────────────────────────────────────────────────────
create table public.pendientes (
  id           uuid primary key,                                 -- lo genera el cliente
  caso_id      uuid not null references public.casos (id) on delete cascade,
  animal_id    uuid references public.animales (id) on delete cascade,
  tipo         text not null check (tipo in ('CASTRACION', 'ESTUDIO', 'CIRUGIA', 'ESPECIALISTA', 'OTRO')),
  descripcion  text not null,
  resuelto     boolean not null default false,
  resuelto_en  timestamptz,
  creado_por   uuid not null default auth.uid() references public.perfiles (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index pendientes_caso_idx on public.pendientes (caso_id) where not resuelto;

alter table public.pendientes enable row level security;

create policy pendientes_ver on public.pendientes
  for select to authenticated using (public.es_voluntario_activo());

create policy pendientes_crear on public.pendientes
  for insert to authenticated
  with check (public.es_voluntario_activo() and creado_por = auth.uid());

create policy pendientes_editar on public.pendientes
  for update to authenticated
  using (public.es_voluntario_activo()) with check (public.es_voluntario_activo());

create function public.tocar_pendiente() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.creado_por := old.creado_por;
  new.caso_id := old.caso_id;
  if new.resuelto and not old.resuelto then
    new.resuelto_en := coalesce(new.resuelto_en, now());
  elsif not new.resuelto then
    new.resuelto_en := null;
  end if;
  return new;
end;
$$;

create trigger pendientes_tocar
  before update on public.pendientes
  for each row execute function public.tocar_pendiente();

-- ─────────────────────────────────────────────────────────────
-- Adopciones: una fila por adopción. Si el animal vuelve, queda el registro
-- anterior (hay casos que se adoptaron y volvieron) y se abre otra.
-- Datos personales del adoptante: solo coordinadores.
-- ─────────────────────────────────────────────────────────────
create table public.adopciones (
  id                  uuid primary key,                          -- lo genera el cliente
  caso_id             uuid not null references public.casos (id) on delete cascade,
  adoptante_nombre    text not null,
  adoptante_telefono  text,
  adoptante_correo    text,
  fecha_adopcion      timestamptz not null,
  fecha_devolucion    timestamptz,
  motivo_devolucion   text,
  registrada_por      uuid not null default auth.uid() references public.perfiles (id),
  created_at          timestamptz not null default now(),
  check (fecha_devolucion is null or fecha_devolucion >= fecha_adopcion),
  check (motivo_devolucion is null or fecha_devolucion is not null)
);

create index adopciones_caso_idx on public.adopciones (caso_id);

alter table public.adopciones enable row level security;

create policy adopciones_coordinador on public.adopciones
  for all to authenticated
  using (public.es_coordinador())
  with check (public.es_coordinador() and registrada_por = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- Permisos de la Data API (como en el esquema inicial: solo con sesión).
-- Las políticas RLS de arriba restringen además qué filas puede tocar cada uno.
-- ─────────────────────────────────────────────────────────────
grant select, insert, update on public.animales   to authenticated;
grant select, insert, update on public.pendientes  to authenticated;
grant select, insert, update on public.adopciones  to authenticated;
