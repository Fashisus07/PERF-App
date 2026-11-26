import {
  atiendeEnFecha,
  Clinica,
  conHora,
  DiaSemana,
  diasDeClinica,
  diaSemanaDeFecha,
  DURACION_TURNO_MIN,
  ETIQUETA_DIA_SEMANA,
  ETIQUETA_MOTIVO,
  formatearDiasAtencion,
  formatoTurnoCorto,
  HORARIOS_CLINICA,
  horariosDeClinica,
  horaDe,
  SolicitudTurno,
  sumarDias,
  Turno,
} from '../models/Turno';
import { Caso } from '../models/Caso';
import { TurnoRepository } from '../repositories/TurnoRepository';
import { RecordatorioTurnos } from '../services/RecordatorioTurnos';

export type OpcionTurno = { fecha: Date; espera: number };

export class CupoNoDisponible extends Error {
  constructor(public readonly solicitud: SolicitudTurno, public readonly opciones: OpcionTurno[]) {
    super('Cupo no disponible');
  }
}

const ocupado = (fecha: Date, ocupados: Date[]) => ocupados.some((o) => o.getTime() === fecha.getTime());

export function proximosLibres(
  desde: Date,
  ocupados: Date[],
  cantidad = 2,
  horarios: readonly string[] = HORARIOS_CLINICA,
  diasAtencion?: readonly DiaSemana[],
): OpcionTurno[] {
  const permitidos = diasAtencion && diasAtencion.length ? diasAtencion : null;
  const libres: OpcionTurno[] = [];
  for (let d = 0; d < 14 && libres.length < cantidad; d++) {
    const dia = sumarDias(desde, d);
    if (permitidos && !permitidos.includes(diaSemanaDeFecha(dia))) continue;
    for (const hora of horarios) {
      const f = conHora(dia, hora);
      if (f.getTime() > desde.getTime() && !ocupado(f, ocupados)) {
        libres.push({ fecha: f, espera: f.getTime() - desde.getTime() });
        if (libres.length === cantidad) break;
      }
    }
  }
  return libres;
}

export type TurnoAgendado = { turno: Turno; clinica?: Clinica; recordatorioProgramado: boolean };

export class AgendarTurno {
  constructor(
    private readonly repo: TurnoRepository,
    private readonly recordatorios: RecordatorioTurnos,
  ) {}

  async ejecutar(s: SolicitudTurno, caso: Caso, ahora = new Date()): Promise<TurnoAgendado> {
    const ts = typeof s.fechaHora === 'number' ? s.fechaHora : ((s as any).fecha ? (s as any).fecha.getTime() : 0);
    if (ts <= ahora.getTime()) {
      throw new Error('El horario elegido ya pasó');
    }

    // La agenda no se puede superponer: ni con otro turno a la misma hora, ni en otra clínica.
    const agendados = await this.repo.obtenerTurnos();
    const choque = agendados.find(
      (t) => !t.cumplido && Math.abs(t.fechaHora - ts) < DURACION_TURNO_MIN * 60_000,
    );
    if (choque) {
      throw new Error(
        `Ya tenés un turno el ${formatoTurnoCorto(choque.fechaHora)} (${choque.motivo}). ` +
          'Elegí otro horario para que no se superpongan.',
      );
    }

    const clinicaId = s.centroVeterinarioId || (s as any).clinicaId;
    const clinicas = await this.repo.obtenerClinicas();
    const clinica = clinicas.find((c) => c.id === clinicaId);

    if (clinicaId) {
      const ocupados = await this.repo.horariosOcupados(clinicaId);
      const fechaCita = new Date(ts);
      const horarios = horariosDeClinica(clinica);
      // Validar día de atención configurado en la veterinaria (si eligió días puntuales).
      if (clinica && !atiendeEnFecha(clinica, fechaCita)) {
        const diaTexto = ETIQUETA_DIA_SEMANA[diaSemanaDeFecha(fechaCita)];
        throw new Error(
          `${clinica.nombre} no atiende los ${diaTexto}. Días de atención: ${formatearDiasAtencion(clinica.diasAtencion)}.`,
        );
      }
      // Cada veterinario atiende en sus horarios: no se puede reservar fuera de ellos.
      if (clinica && !horarios.includes(horaDe(fechaCita))) {
        throw new Error(`${clinica.nombre} no atiende a las ${horaDe(fechaCita)}. Horarios: ${horarios.join(', ')}.`);
      }
      if (ocupado(fechaCita, ocupados)) {
        throw new CupoNoDisponible(s, proximosLibres(fechaCita, ocupados, 2, horarios, diasDeClinica(clinica)));
      }
    }

    const motivoDesc = ETIQUETA_MOTIVO[s.motivo] || s.motivo;
    const turno = await this.repo.agregar(s, motivoDesc);
    const recordatorioProgramado = await this.recordatorios.programar(turno, clinica, caso.nombreProvisorio);

    return { turno, clinica, recordatorioProgramado };
  }
}
