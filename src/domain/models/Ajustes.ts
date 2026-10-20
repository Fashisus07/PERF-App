export type Ajustes = {
  umbralUrgenteDias: number; // los casos con más días de espera se marcan como urgentes
  modoOfflineAutomatico: boolean;
  recordatorioUnDia: boolean; // aviso 1 día antes del turno
  alertaDosHoras: boolean; // aviso 2 horas antes del turno
};

export const UMBRAL_MIN = 1;
export const UMBRAL_MAX = 30;

export const ajustesPorDefecto: Ajustes = {
  umbralUrgenteDias: 7,
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

export type Voluntario = { nombre: string; brigada: string };
