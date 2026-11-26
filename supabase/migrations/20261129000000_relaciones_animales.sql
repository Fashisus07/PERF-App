-- PERF-App: registro individual por animal con relaciones familiares / de camada
-- (ej: Hijo de Mora, Hermana de Mora, Papá de Mora, Mamá de Mora).
-- Se pega UNA vez en Supabase (idempotente y no destructivo).

create table if not exists public.relaciones_animales (
  id              uuid primary key,
  caso_origen_id  uuid not null references public.casos (id) on delete cascade,
  tipo_relacion   text not null
                  check (tipo_relacion in (
                    'HIJO_DE', 'HIJA_DE', 'HERMANO_DE', 'HERMANA_DE',
                    'MAMA_DE', 'PAPA_DE', 'CAMADA_DE', 'OTRA'
                  )),
  caso_destino_id uuid references public.casos (id) on delete set null,
  nombre_destino  text not null,
  creado_por      uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at      timestamptz not null default now()
);

create index if not exists relaciones_origen_idx
  on public.relaciones_animales (caso_origen_id);
create index if not exists relaciones_destino_idx
  on public.relaciones_animales (caso_destino_id);

alter table public.relaciones_animales enable row level security;

drop policy if exists relaciones_ver on public.relaciones_animales;
create policy relaciones_ver on public.relaciones_animales
  for select to authenticated using (public.es_voluntario_activo());

drop policy if exists relaciones_crear on public.relaciones_animales;
create policy relaciones_crear on public.relaciones_animales
  for insert to authenticated with check (public.es_voluntario_activo());

drop policy if exists relaciones_actualizar on public.relaciones_animales;
create policy relaciones_actualizar on public.relaciones_animales
  for update to authenticated
  using (public.es_voluntario_activo()) with check (public.es_voluntario_activo());

drop policy if exists relaciones_borrar on public.relaciones_animales;
create policy relaciones_borrar on public.relaciones_animales
  for delete to authenticated using (public.es_voluntario_activo());

grant select, insert, update, delete on public.relaciones_animales to authenticated;

notify pgrst, 'reload schema';
