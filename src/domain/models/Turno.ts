export type EstadoTurno = 'confirmado' | 'porConfirmar';
export type MotivoConsulta = 'control' | 'vacunacion' | 'cirugia' | 'laboratorio' | 'urgencia';
export type AvisoTurno = '1dia' | '2horas';

export const ETIQUETA_MOTIVO: Record<MotivoConsulta, string> = {
  control: 'Control clínico',
  vacunacion: 'Vacunación',
  cirugia: 'Castración / Quirúrgico',
  laboratorio: 'Laboratorio / Ecografía',
  urgencia: 'Urgencia',
};

export const ETIQUETA_AVISO: Record<AvisoTurno, string> = { '1dia': '1 día antes', '2horas': '2 horas antes' };
export const MS_AVISO: Record<AvisoTurno, number> = { '1dia': 24 * 60 * 60 * 1000, '2horas': 2 * 60 * 60 * 1000 };

export type Clinica = {
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
};

export type Turno = {
  id: string;
  casoId: string;
  clinicaId: string;
  fecha: Date; // día y hora de inicio
  motivo: MotivoConsulta;
  titulo: string; // ej: "Chequeo general y vacunación"
  notas?: string;
  estado: EstadoTurno;
  avisos: AvisoTurno[];
  aviso?: { titulo: string; texto: string }; // ej: ayuno obligatorio
};

export type SolicitudTurno = {
  casoId: string;
  clinicaId: string;
  fecha: Date;
  motivo: MotivoConsulta;
  notas?: string;
  avisos: AvisoTurno[];
};

// Horarios de atención de cada clínica (los 4 primeros se ofrecen en el formulario).
export const HORARIOS_CLINICA = ['09:00', '10:30', '11:15', '12:15', '16:00', '18:30'];
export const HORARIOS_FORMULARIO = ['10:30', '11:15', '16:00', '18:30'];

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

// "Hoy" / "Mañana" / "Jueves 24 de Octubre"
export function etiquetaDia(d: Date, ahora = new Date()) {
  if (mismoDia(d, ahora)) return 'Hoy';
  if (mismoDia(d, sumarDias(ahora, 1))) return 'Mañana';
  return diaLargo(d);
}

// "1h 45m" / "45m"
export function duracionCorta(ms: number) {
  const min = Math.round(ms / 60000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}
