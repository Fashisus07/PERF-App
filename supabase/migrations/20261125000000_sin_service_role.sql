-- PERF-App: la app deja de usar la clave service_role.
-- Se pega UNA vez en el SQL Editor de Supabase (idempotente, no borra datos).
--
-- Antes la app guardaba los recursos del postulante con la clave maestra. Ahora el trigger que crea
-- el perfil los copia de los datos del registro, así no hace falta ninguna operación privilegiada
-- desde el celular. Aprobar y rechazar desde la app usan aprobar_voluntario / rechazar_voluntario
-- (ya definidas, solo para coordinadores). El enlace del correo y los avisos a coordinadores van por
-- las Edge Functions supabase/functions/notificar-voluntario y gestionar-voluntario.

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
