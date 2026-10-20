import {
  AvisoTurno,
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

export type OpcionTurno = { fecha: Date; espera: number }; // espera: ms respecto del horario pedido

// El horario pedido ya fue reservado por otra guardia. Trae alternativas libres en la misma clínica.
export class CupoNoDisponible extends Error {
  constructor(public readonly solicitud: SolicitudTurno, public readonly opciones: OpcionTurno[]) {
    super('Cupo no disponible');
  }
}

const ocupado = (fecha: Date, ocupados: Date[]) => ocupados.some((o) => o.getTime() === fecha.getTime());

// Próximos horarios libres de la clínica, a partir del pedido (revisa los 7 días siguientes).
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

export type TurnoAgendado = { turno: Turno; clinica: Clinica; avisosProgramados: AvisoTurno[] };

export class AgendarTurno {
  constructor(
    private readonly repo: TurnoRepository,
    private readonly recordatorios: RecordatorioTurnos,
  ) {}

  async ejecutar(s: SolicitudTurno, caso: Caso, ahora = new Date()): Promise<TurnoAgendado> {
    if (s.fecha.getTime() <= ahora.getTime()) throw new Error('El horario elegido ya pasó');

    const clinicas = await this.repo.obtenerClinicas();
    const clinica = clinicas.find((c) => c.id === s.clinicaId);
    if (!clinica) throw new Error('Clínica inexistente');

    const ocupados = await this.repo.horariosOcupados(s.clinicaId);
    if (ocupado(s.fecha, ocupados)) throw new CupoNoDisponible(s, proximosLibres(s.fecha, ocupados));

    const turno = await this.repo.agregar(s, ETIQUETA_MOTIVO[s.motivo]);
    const avisosProgramados = s.avisos.length ? await this.recordatorios.programar(turno, clinica, caso.nombre) : [];
    return { turno, clinica, avisosProgramados };
  }
}
