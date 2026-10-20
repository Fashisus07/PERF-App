import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { CasoRepositoryImpl } from '../../data/repositories/CasoRepositoryImpl';
import { TurnoRepositoryImpl } from '../../data/repositories/TurnoRepositoryImpl';
import { RecordatoriosNotificaciones } from '../../data/local/RecordatoriosNotificaciones';
import { Caso } from '../../domain/models/Caso';
import { Clinica, Turno } from '../../domain/models/Turno';
import { AgendarTurno } from '../../domain/usecases/AgendarTurno';
import { CancelarTurno } from '../../domain/usecases/CancelarTurno';
import { ListarTurnos } from '../../domain/usecases/ListarTurnos';

// Composición simple de dependencias (sin framework de DI).
const repo = new TurnoRepositoryImpl();
const recordatorios = new RecordatoriosNotificaciones();
const casos = new CasoRepositoryImpl();
export const listarTurnos = new ListarTurnos(repo);
export const agendarTurno = new AgendarTurno(repo, recordatorios);
export const cancelarTurno = new CancelarTurno(repo, recordatorios);
export const obtenerClinicas = () => repo.obtenerClinicas();

// Agenda: turnos próximos + los casos para mostrar nombre y foto de cada uno.
export function useTurnos() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [casosPorId, setCasosPorId] = useState<Record<string, Caso>>({});
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(() => {
    Promise.all([listarTurnos.ejecutar(), casos.obtenerActivos()])
      .then(([r, lista]) => {
        setTurnos(r.turnos);
        setClinicas(r.clinicas);
        setCasosPorId(Object.fromEntries(lista.map((c) => [c.id, c])));
      })
      .finally(() => setCargando(false));
  }, []);

  // Se recarga al volver a la pestaña (ej: después de agendar un turno).
  useFocusEffect(cargar);

  return { turnos, clinicas, casosPorId, cargando, recargar: cargar };
}

// Un turno recién agendado con su clínica y su caso (para la pantalla de confirmación).
export function useTurnoCompleto(turnoId: string) {
  const [datos, setDatos] = useState<{ turno: Turno; clinica: Clinica; caso: Caso } | null>(null);
  useFocusEffect(
    useCallback(() => {
      Promise.all([repo.obtenerTurnos(), repo.obtenerClinicas(), casos.obtenerActivos()]).then(([ts, cs, lista]) => {
        const turno = ts.find((t) => t.id === turnoId);
        const clinica = cs.find((c) => c.id === turno?.clinicaId);
        const caso = lista.find((c) => c.id === turno?.casoId);
        setDatos(turno && clinica && caso ? { turno, clinica, caso } : null);
      });
    }, [turnoId]),
  );
  return datos;
}
