-- PERF-App: el coordinador responsable de un caso pasa a ser un registro con ID propio.
-- Se pega UNA vez en el SQL Editor de Supabase. Es idempotente y NO borra datos.
--
-- Antes `casos.quien_sigue_caso` guardaba un nombre ("Cami") y "Mis casos" comparaba texto. Ahora
-- hay una tabla `coordinadores` (los cuatro de PERF, cada uno puede enlazarse a una cuenta de
-- voluntario con `perfil_id`) y `casos.coordinador_id` apunta a ella. `quien_sigue_caso` se conserva
-- como nombre visible, así lo que ya existe sigue funcionando.

create table if not exists public.coordinadores (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  perfil_id  uuid references public.perfiles (id) on delete set null,   -- su cuenta, si tiene
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.coordinadores enable row level security;

drop policy if exists coordinadores_ver on public.coordinadores;
create policy coordinadores_ver on public.coordinadores
  for select to authenticated using (public.es_voluntario_activo());

drop policy if exists coordinadores_administrar on public.coordinadores;
create policy coordinadores_administrar on public.coordinadores
  for all to authenticated
  using (public.es_coordinador()) with check (public.es_coordinador());

grant select, insert, update, delete on public.coordinadores to authenticated;

insert into public.coordinadores (nombre)
values ('Cami'), ('Juli'), ('Martu'), ('Nay')
on conflict (nombre) do nothing;

alter table public.casos
  add column if not exists coordinador_id uuid references public.coordinadores (id) on delete set null;
create index if not exists casos_coordinador_idx on public.casos (coordinador_id);

-- Los casos que ya existían: se enlazan por el nombre que tenían escrito (sin mayúsculas ni espacios de más).
update public.casos c
set coordinador_id = k.id
from public.coordinadores k
where c.coordinador_id is null
  and lower(btrim(c.quien_sigue_caso)) = lower(k.nombre);

-- aplicar_cambios_caso(): igual que la de 20261124, con `coordinador_id` entre los campos editables.
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
    'foto_remote_path', 'coordinador_id'
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

-- Cómo comprobarlo:
--   select nombre, perfil_id from public.coordinadores order by nombre;           -- 4 filas
--   select count(*) from public.casos where coordinador_id is null;                -- casos sin coordinador enlazado
