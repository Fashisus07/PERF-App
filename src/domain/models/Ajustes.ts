export type Ajustes = {
  umbralUrgenteDias: number; // los casos con más días de espera se marcan como urgentes
  modoOfflineAutomatico: boolean;
  recordatorioMinutosDefault: number; // anticipación por defecto del aviso de turno, en minutos
};

export const UMBRAL_MIN = 1;
export const UMBRAL_MAX = 30;

export const ajustesPorDefecto: Ajustes = {
  umbralUrgenteDias: 15,
  modoOfflineAutomatico: true,
  recordatorioMinutosDefault: 120,
};

export type ResumenAlmacenamiento = {
  casosActivos: number;
  archivados: number;
  megabytes: number; // estimado
  capacidadMegabytes: number;
};

export type RolVoluntario = 'voluntario' | 'coordinador';

export type Voluntario = {
  id?: string;
  nombre: string;
  brigada: string;
  email?: string;
  telefono?: string;
  zona?: string;
  recursos?: string[];
  rol?: RolVoluntario;
  aprobado?: boolean;
  createdAt?: string;
  tokenAprobacion?: string;
};
