import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  casoRepository,
  turnoRepository,
  recordatorioService,
  listarTurnosUseCase,
  agendarTurnoUseCase,
} from '../../di/container';
import { Caso } from '../../domain/models/Caso';
import { Clinica, Turno } from '../../domain/models/Turno';
import { CancelarTurno } from '../../domain/usecases/CancelarTurno';

export const cancelarTurno = new CancelarTurno(turnoRepository, recordatorioService);
export const listarTurnos = listarTurnosUseCase;
export const agendarTurno = agendarTurnoUseCase;
export const obtenerClinicas = () => turnoRepository.obtenerClinicas();

// Agenda: turnos próximos + los casos para mostrar nombre y foto de cada uno.
export function useTurnos() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [casosPorId, setCasosPorId] = useState<Record<string, Caso>>({});
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(() => {
    Promise.all([listarTurnos.ejecutar(), casoRepository.obtenerActivos()])
      .then(([r, lista]) => {
        setTurnos(r.turnos);
        setClinicas(r.clinicas);
        setCasosPorId(Object.fromEntries(lista.map((c) => [c.id, c])));
      })
      .finally(() => setCargando(false));
  }, []);

  useFocusEffect(cargar);

  return { turnos, clinicas, casosPorId, cargando, recargar: cargar };
}

// Un turno recién agendado con su clínica y su caso (para la pantalla de confirmación).
export function useTurnoCompleto(turnoId: string) {
  const [datos, setDatos] = useState<{ turno: Turno; clinica: Clinica; caso: Caso } | null>(null);
  useFocusEffect(
    useCallback(() => {
      Promise.all([
        turnoRepository.obtenerTurnos(),
        turnoRepository.obtenerClinicas(),
        casoRepository.obtenerActivos(),
      ]).then(([ts, cs, lista]) => {
        const turno = ts.find((t) => t.id === turnoId);
        const clinica = cs.find((c) => c.id === (turno?.centroVeterinarioId || (turno as any)?.clinicaId));
        const caso = lista.find((c) => c.id === turno?.casoId);
        setDatos(turno && clinica && caso ? { turno, clinica, caso } : null);
      });
    }, [turnoId])
  );
  return datos;
}
