-- Días de atención configurables por veterinaria (array de claves: lun..dom; null = todos los días).
alter table public.centros_veterinarios
  add column if not exists dias_atencion text[];
