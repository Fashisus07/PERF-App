export type Ajustes = {
  umbralUrgenteDias: number; // los casos con más días de espera se marcan como urgentes
  modoOfflineAutomatico: boolean;
  recordatorioUnDia: boolean; // aviso 1 día antes del turno
  alertaDosHoras: boolean; // aviso 2 horas antes del turno
};

export const UMBRAL_MIN = 1;
export const UMBRAL_MAX = 30;

export const ajustesPorDefecto: Ajustes = {
  umbralUrgenteDias: 15,
  modoOfflineAutomatico: true,
  recordatorioUnDia: true,
  alertaDosHoras: true,
};

export type ResumenAlmacenamiento = {
  casosActivos: number;
  archivados: number;
  megabytes: number; // estimado
  capacidadMegabytes: number;
};

export type RolVoluntario = 'voluntario' | 'coordinador';

/**
 * En la base el rol del administrador se sigue llamando 'coordinador' (así lo usan el panel de
 * aprobaciones y los correos). En la app se muestra como "Administrador" y hay uno solo.
 */
export const ETIQUETA_ROL: Record<RolVoluntario, string> = {
  coordinador: 'Administrador',
  voluntario: 'Voluntario',
};

export function esAdministrador(rol?: RolVoluntario | null): boolean {
  return rol === 'coordinador';
}

/** Barrios y zonas que un voluntario puede cubrir (se pueden elegir varias). */
export const ZONAS_DISPONIBLES = [
  'Balvanera',
  'Caballito',
  'Almagro',
  'Palermo',
  'San Telmo',
  'Flores',
  'Villa Crespo',
  'Boedo',
  'Belgrano',
  'Recoleta',
  'Villa Urquiza',
  'Núñez',
  'Colegiales',
  'Chacarita',
  'Parque Patricios',
  'Barracas',
  'La Boca',
  'Constitución',
  'Villa del Parque',
  'Devoto',
  'Zona Norte (GBA)',
  'Zona Sur (GBA)',
  'Zona Oeste (GBA)',
] as const;

const SEPARADOR_ZONAS = ', ';

/** La base guarda las zonas en una sola columna de texto: "Caballito, Almagro". */
export function zonasDesdeTexto(texto?: string | null): string[] {
  return (texto ?? '')
    .split(',')
    .map((z) => z.trim())
    .filter(Boolean);
}

export function zonasATexto(zonas: string[]): string {
  return Array.from(new Set(zonas.map((z) => z.trim()).filter(Boolean))).join(SEPARADOR_ZONAS);
}

export type Voluntario = {
  id?: string;
  nombre: string;
  brigada: string;
  email?: string;
  telefono?: string;
  zona?: string; // zonas que cubre, separadas por coma
  recursos?: string[];
  rol?: RolVoluntario;
  aprobado?: boolean;
  createdAt?: string;
  tokenAprobacion?: string;
};

/** Un caso es "de" un voluntario si el nombre de quien lo sigue coincide con su nombre o su primer nombre. */
export function sigueElCaso(quienSigue: string, voluntario: Pick<Voluntario, 'nombre'> | null): boolean {
  const sigue = quienSigue.trim().toLowerCase();
  const nombre = (voluntario?.nombre ?? '').trim().toLowerCase();
  if (!sigue || !nombre) return false;
  return nombre === sigue || nombre.split(/\s+/)[0] === sigue;
}
