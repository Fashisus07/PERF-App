import {
  Clinica,
  conHora,
  ETIQUETA_MOTIVO,
  HORARIOS_CLINICA,
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

export function proximosLibres(desde: Date, ocupados: Date[], cantidad = 2): OpcionTurno[] {
  const libres: OpcionTurno[] = [];
  for (let d = 0; d < 7 && libres.length < cantidad; d++) {
    const dia = sumarDias(desde, d);
    for (const hora of HORARIOS_CLINICA) {
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

    const clinicaId = s.centroVeterinarioId || (s as any).clinicaId;
    const clinicas = await this.repo.obtenerClinicas();
    const clinica = clinicas.find((c) => c.id === clinicaId);

    if (clinicaId) {
      const ocupados = await this.repo.horariosOcupados(clinicaId);
      const fechaCita = new Date(ts);
      if (ocupado(fechaCita, ocupados)) {
        throw new CupoNoDisponible(s, proximosLibres(fechaCita, ocupados));
      }
    }

    const motivoDesc = ETIQUETA_MOTIVO[s.motivo] || s.motivo;
    const turno = await this.repo.agregar(s, motivoDesc);
    const recordatorioProgramado = await this.recordatorios.programar(turno, clinica, caso.nombreProvisorio);

    return { turno, clinica, recordatorioProgramado };
  }
}
