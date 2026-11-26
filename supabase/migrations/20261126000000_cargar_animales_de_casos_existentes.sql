-- PERF-App: crea los animales de los casos que ya existían antes de que la app manejara animales.
-- Se pega UNA vez en el SQL Editor de Supabase. Es idempotente (solo toca casos que no tienen
-- ningún animal) y NO borra ni modifica datos existentes.
--
-- Cada caso recibe tantos animales como `cantidad_animales`, con la ficha sanitaria del caso
-- (castrado, virales, desparasitaciones). Si hay más de uno se numeran: "Camada 1", "Camada 2".
-- Los ids los genera la base una sola vez, así todos los celulares bajan los mismos animales.

insert into public.animales (
  id, caso_id, nombre, castrado, virales_vif_vilef,
  fecha_primera_desparasitacion, fecha_segunda_desparasitacion, creado_por
)
select
  gen_random_uuid(),
  c.id,
  case when greatest(c.cantidad_animales, 1) = 1 then c.nombre_provisorio else c.nombre_provisorio || ' ' || n end,
  c.castrado,
  c.virales_vif_vilef,
  c.fecha_primera_desparasitacion,
  c.fecha_segunda_desparasitacion,
  c.creado_por
from public.casos c
cross join lateral generate_series(1, greatest(c.cantidad_animales, 1)) as n
where not exists (select 1 from public.animales a where a.caso_id = c.id);

-- Cómo comprobarlo: cada caso debe tener al menos un animal (debe devolver 0 filas).
--   select c.id, c.nombre_provisorio from public.casos c
--   where not exists (select 1 from public.animales a where a.caso_id = c.id);
