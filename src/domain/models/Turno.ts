import { SyncStatus } from './Caso';

// ─── Entidad Turno veterinario ───

export interface Turno {
  id: string; // UUID
  casoId: string; // FK → casos.id
  centroVeterinarioId?: string; // FK → centros_veterinarios.id (o nombre en texto libre)
  fechaHora: number; // Timestamp de la cita
  motivo: string; // Texto libre: 'Castración', 'Control tumor de mama', etc.
  recordatorioMinutos: number; // Minutos de anticipación (120 = 2h, 1440 = 24h)
  cumplido: boolean;
  notificationId?: string | null; // ID de notificación local de expo-notifications para cancelación
  syncStatus: SyncStatus;
  updatedAt: number;
}

// ─── Solicitud para agendar un turno (antes de persistir) ───

export interface SolicitudTurno {
  casoId: string;
  centroVeterinarioId?: string;
  fechaHora: number; // Timestamp
  motivo: string;
  recordatorioMinutos: number;
}

// ─── Centro veterinario (catálogo local o futura tabla) ───

export interface CentroVeterinario {
  id: string;
  nombre: string;
  medico?: string;
  barrio: string;
  direccion: string;
  telefono: string;
  detalle?: string; // ej: "Guardia 24 hs"
  distancia?: string; // ej: "A 12 cuadras de la base"
  abierto: boolean;
  tipo: 'consultorio' | 'hospital' | 'quirurgico';
  horarios?: string[];
}

export type Clinica = CentroVeterinario;

export type MotivoConsulta = 'control' | 'vacunacion' | 'cirugia' | 'laboratorio' | 'urgencia';

export const ETIQUETA_MOTIVO: Record<string, string> = {
  control: 'Control clínico',
  vacunacion: 'Vacunación',
  cirugia: 'Castración / Quirúrgico',
  laboratorio: 'Laboratorio / Ecografía',
  urgencia: 'Urgencia',
};

// ─── Recordatorios: opciones predefinidas ───

/** Opciones de anticipación que se ofrecen al agendar y en Ajustes (se elige una). */
export const OPCIONES_RECORDATORIO = [
  { label: '30 minutos antes', corto: '30 min', minutos: 30 },
  { label: '1 hora antes', corto: '1 hora', minutos: 60 },
  { label: '2 horas antes', corto: '2 horas', minutos: 120 },
  { label: '1 día antes', corto: '1 día', minutos: 1440 },
  { label: '2 días antes', corto: '2 días', minutos: 2880 },
] as const;

export const RECORDATORIO_POR_DEFECTO_MIN = 120;

/** Texto de un recordatorio guardado, también para valores viejos o a medida (ej: 90 → "1 h 30 min antes"). */
export function etiquetaRecordatorio(minutos: number): string {
  const op = OPCIONES_RECORDATORIO.find((o) => o.minutos === minutos);
  if (op) return op.label;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h ? `${h} h` : ''}${h && m ? ' ' : ''}${m ? `${m} min` : ''} antes`;
}

// ─── Horarios de atención (mock del catálogo de centros) ───

export const HORARIOS_CLINICA = ['09:00', '10:30', '11:15', '12:15', '16:00', '18:30'];
export const HORARIOS_FORMULARIO = ['10:30', '11:15', '16:00', '18:30'];

const FORMATO_HORARIO = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "9:5" no es un horario; "09:05" sí. */
export const esHorarioValido = (hhmm: string) => FORMATO_HORARIO.test(hhmm);

/** Sin repetidos, sin valores inválidos y de menor a mayor. */
export function normalizarHorarios(horarios: readonly string[] | null | undefined): string[] {
  return Array.from(new Set((horarios ?? []).map((h) => h.trim()).filter(esHorarioValido))).sort();
}

/** Horarios en que atiende una clínica: los suyos o, si no cargó ninguno, los de siempre. */
export function horariosDeClinica(clinica?: Pick<CentroVeterinario, 'horarios'> | null): string[] {
  const propios = normalizarHorarios(clinica?.horarios);
  return propios.length ? propios : HORARIOS_CLINICA;
}

/** Lo que dura cada turno: dos turnos a menos de esto de distancia se superponen (45 min = separación mínima entre horarios). */
export const DURACION_TURNO_MIN = 45;

// ─── Helpers de fecha ───

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const mismoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const sumarDias = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

export const conHora = (dia: Date, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const r = new Date(dia);
  r.setHours(h, m, 0, 0);
  return r;
};

export const horaDe = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
export const nombreDia = (d: Date) => DIAS[d.getDay()];
export const diaLargo = (d: Date) => `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
export const diaCorto = (d: Date) => `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;

export function etiquetaDia(d: Date, ahora = new Date()) {
  if (mismoDia(d, ahora)) return 'Hoy';
  if (mismoDia(d, sumarDias(ahora, 1))) return 'Mañana';
  return diaLargo(d);
}

export function duracionCorta(ms: number) {
  const min = Math.round(ms / 60000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

/** Formatea un timestamp a "Lun 24 Oct • 10:30 hs" */
export function formatoTurnoCorto(ts: number): string {
  const d = new Date(ts);
  return `${diaCorto(d)} • ${horaDe(d)} hs`;
}
