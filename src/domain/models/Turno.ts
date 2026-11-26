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

// ─── Recordatorios: anticipación configurable (valor + unidad, sin opciones fijas) ───

export type UnidadRecordatorio = 'minutos' | 'horas' | 'dias';

export const UNIDADES_RECORDATORIO: UnidadRecordatorio[] = ['minutos', 'horas', 'dias'];

export const ETIQUETA_UNIDAD: Record<UnidadRecordatorio, { singular: string; plural: string }> = {
  minutos: { singular: 'minuto', plural: 'minutos' },
  horas: { singular: 'hora', plural: 'horas' },
  dias: { singular: 'día', plural: 'días' },
};

/** Cuánto avanza cada toque del selector, según la unidad elegida. */
export const PASO_UNIDAD: Record<UnidadRecordatorio, number> = { minutos: 5, horas: 1, dias: 1 };

/** Rango permitido de anticipación para cada unidad: minutos hasta completar la hora, horas hasta completar el día. */
export const LIMITE_UNIDAD: Record<UnidadRecordatorio, { min: number; max: number }> = {
  minutos: { min: 5, max: 60 },
  horas: { min: 1, max: 24 },
  dias: { min: 1, max: 14 },
};

export const RECORDATORIO_POR_DEFECTO = 120; // 2 horas

export const minutosDeAnticipacion = (valor: number, unidad: UnidadRecordatorio): number =>
  unidad === 'minutos' ? valor : unidad === 'horas' ? valor * 60 : valor * 1440;

/** Recorta al rango de la unidad y lo redondea al escalón del selector (ej: minutos solo de 5 en 5). */
export function normalizarValorUnidad(valor: number, unidad: UnidadRecordatorio): number {
  const { min, max } = LIMITE_UNIDAD[unidad];
  const paso = PASO_UNIDAD[unidad];
  const recortado = Math.min(Math.max(valor, min), max);
  const redondeado = Math.round(recortado / paso) * paso;
  return Math.min(Math.max(redondeado, min), max);
}

/** La unidad más grande que representa los minutos exactamente, sin recortar al rango del selector. */
function mayorUnidadExacta(minutos: number): { valor: number; unidad: UnidadRecordatorio } {
  if (minutos % 1440 === 0) return { valor: minutos / 1440, unidad: 'dias' };
  if (minutos % 60 === 0) return { valor: minutos / 60, unidad: 'horas' };
  return { valor: minutos, unidad: 'minutos' };
}

/** Para inicializar el selector a partir de un valor guardado: misma idea, pero ajustada al rango y escalón permitidos. */
export function descomponerAnticipacion(minutos: number): { valor: number; unidad: UnidadRecordatorio } {
  const { valor, unidad } = mayorUnidadExacta(minutos);
  return { valor: normalizarValorUnidad(valor, unidad), unidad };
}

export function etiquetaRecordatorio(minutos: number): string {
  const { valor, unidad } = mayorUnidadExacta(minutos);
  const palabra = valor === 1 ? ETIQUETA_UNIDAD[unidad].singular : ETIQUETA_UNIDAD[unidad].plural;
  return `${valor} ${palabra} antes`;
}

// ─── Horarios de atención (mock del catálogo de centros) ───

export const HORARIOS_CLINICA = ['09:00', '10:30', '11:15', '12:15', '16:00', '18:30'];
export const HORARIOS_FORMULARIO = ['10:30', '11:15', '16:00', '18:30'];

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
