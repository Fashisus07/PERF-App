import { Caso } from '../../models/Caso';
import {
  atiendeEnFecha,
  Clinica,
  conHora,
  DIAS_SEMANA,
  esHorarioValido,
  formatearDiasAtencion,
  horariosDeClinica,
  HORARIOS_CLINICA,
  normalizarDiasAtencion,
  normalizarHorarios,
  SolicitudTurno,
  sumarDias,
  Turno,
} from '../../models/Turno';
import { TurnoRepository } from '../../repositories/TurnoRepository';
import { AgendarTurno, CupoNoDisponible, proximosLibres } from '../AgendarTurno';

const clinica = (horarios?: string[]): Clinica => ({
  id: 'vet-1',
  nombre: 'Vet del Parque',
  barrio: 'Caballito',
  direccion: 'Acoyte 100',
  telefono: '1',
  abierto: true,
  tipo: 'consultorio',
  horarios,
});

function repoCon(clinicas: Clinica[], ocupados: Date[] = []): TurnoRepository & { agendados: SolicitudTurno[] } {
  const agendados: SolicitudTurno[] = [];
  return {
    agendados,
    obtenerTurnos: async () => [],
    obtenerPorCasoId: async () => [],
    obtenerClinicas: async () => clinicas,
    horariosOcupados: async () => ocupados,
    agregar: async (s) => {
      agendados.push(s);
      return { id: 't1', casoId: s.casoId, centroVeterinarioId: s.centroVeterinarioId, fechaHora: s.fechaHora, motivo: 'x', recordatorioMinutos: 120, cumplido: false, syncStatus: 'PENDING', updatedAt: 1 } as Turno;
    },
    marcarCumplido: async () => ({}) as Turno,
    cancelar: async () => {},
    sincronizar: async () => 0,
  };
}

const recordatorios = { programar: async () => true, cancelar: async () => {} };
const caso = { id: 'c1', nombreProvisorio: 'Misho' } as Caso;
const ahora = new Date(2026, 10, 25, 8, 0, 0);
const manana = (hhmm: string) => conHora(sumarDias(ahora, 1), hhmm).getTime();
const solicitud = (hhmm: string): SolicitudTurno => ({ casoId: 'c1', centroVeterinarioId: 'vet-1', fechaHora: manana(hhmm), motivo: 'control', recordatorioMinutos: 120 });

describe('Horarios de cada veterinario', () => {
  test('normalizarHorarios saca repetidos e inválidos y ordena', () => {
    expect(normalizarHorarios(['16:00', '09:30', '9:5', '09:30', '25:00', 'tarde', ' 10:15 '])).toEqual(['09:30', '10:15', '16:00']);
    expect(normalizarHorarios(undefined)).toEqual([]);
  });

  test('esHorarioValido pide HH:MM de 24 horas', () => {
    expect(['00:00', '09:05', '23:59'].every(esHorarioValido)).toBe(true);
    expect(['24:00', '9:05', '12:60', '12-30', ''].some(esHorarioValido)).toBe(false);
  });

  test('una clínica sin horarios cargados usa los de siempre', () => {
    expect(horariosDeClinica(clinica())).toEqual(HORARIOS_CLINICA);
    expect(horariosDeClinica(clinica([]))).toEqual(HORARIOS_CLINICA);
    expect(horariosDeClinica(clinica(['08:00', '07:00']))).toEqual(['07:00', '08:00']);
  });

  test('se agenda en un horario que atiende el veterinario', async () => {
    const repo = repoCon([clinica(['08:00', '15:00'])]);
    const r = await new AgendarTurno(repo, recordatorios).ejecutar(solicitud('15:00'), caso, ahora);
    expect(r.turno.id).toBe('t1');
    expect(repo.agendados).toHaveLength(1);
  });

  test('no se puede reservar fuera de los horarios del veterinario', async () => {
    const repo = repoCon([clinica(['08:00', '15:00'])]);
    await expect(new AgendarTurno(repo, recordatorios).ejecutar(solicitud('10:30'), caso, ahora)).rejects.toThrow(/no atiende a las 10:30.*08:00, 15:00/);
    expect(repo.agendados).toHaveLength(0);
  });

  test('si el horario está ocupado, las alternativas son los horarios del veterinario', async () => {
    const repo = repoCon([clinica(['08:00', '15:00'])], [new Date(manana('08:00'))]);
    try {
      await new AgendarTurno(repo, recordatorios).ejecutar(solicitud('08:00'), caso, ahora);
      throw new Error('debía rechazar');
    } catch (e) {
      expect(e).toBeInstanceOf(CupoNoDisponible);
      const horas = (e as CupoNoDisponible).opciones.map((o) => `${o.fecha.getHours()}:${String(o.fecha.getMinutes()).padStart(2, '0')}`);
      expect(horas.every((h) => ['8:00', '15:00'].includes(h))).toBe(true);
    }
  });

  test('proximosLibres usa solo los horarios que se le pasan', () => {
    const libres = proximosLibres(ahora, [], 3, ['08:30', '09:30']);
    expect(libres).toHaveLength(3);
    expect(libres.every((o) => [8, 9].includes(o.fecha.getHours()))).toBe(true);
  });

  test('normalizarDiasAtencion y formatearDiasAtencion respetan orden semanal', () => {
    expect(normalizarDiasAtencion(['vie', 'lun', 'DOM', 'x', 'lun'])).toEqual(['lun', 'vie', 'dom']);
    expect(formatearDiasAtencion([])).toBe('Todos los días');
    expect(formatearDiasAtencion(['lun', 'mar', 'mie', 'jue', 'vie'])).toBe('Lun a Vie');
    expect(DIAS_SEMANA).toHaveLength(7);
  });

  test('atiendeEnFecha y AgendarTurno validan los días de atención de la veterinaria', async () => {
    // 2026-11-26 es jueves ('jue'). Si la clínica solo atiende lunes y viernes, debe rechazar.
    const vetLunVie: Clinica = { ...clinica(['09:00', '15:00']), diasAtencion: ['lun', 'vie'] };
    const jueves = sumarDias(ahora, 1);
    const viernes = sumarDias(ahora, 2);
    expect(atiendeEnFecha(vetLunVie, jueves)).toBe(false);
    expect(atiendeEnFecha(vetLunVie, viernes)).toBe(true);

    const repo = repoCon([vetLunVie]);
    await expect(
      new AgendarTurno(repo, recordatorios).ejecutar(solicitud('15:00'), caso, ahora),
    ).rejects.toThrow(/no atiende los Jue.*Lun · Vie/);

    const solViernes: SolicitudTurno = {
      ...solicitud('15:00'),
      fechaHora: conHora(viernes, '15:00').getTime(),
    };
    const r = await new AgendarTurno(repo, recordatorios).ejecutar(solViernes, caso, ahora);
    expect(r.turno.id).toBe('t1');

    const libres = proximosLibres(jueves, [], 2, ['09:00'], ['lun', 'vie']);
    expect(libres).toHaveLength(2);
    expect(libres.every((o) => [1, 5].includes(o.fecha.getDay()))).toBe(true);
  });
});
