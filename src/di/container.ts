import { CasoRepositoryImpl } from '../data/repositories/CasoRepositoryImpl';
import { TurnoRepositoryImpl } from '../data/repositories/TurnoRepositoryImpl';
import { AjustesRepositoryImpl } from '../data/local/AjustesRepositoryImpl';
import { SupabaseAuthRepository } from '../data/remote/SupabaseAuthRepository';
import { RecordatoriosNotificaciones } from '../data/local/RecordatoriosNotificaciones';

import { ListarCasosPorUrgencia } from '../domain/usecases/ListarCasosPorUrgencia';
import { ObtenerCaso } from '../domain/usecases/ObtenerCaso';
import { RegistrarRescate } from '../domain/usecases/RegistrarRescate';
import { CambiarEstadoCaso } from '../domain/usecases/CambiarEstadoCaso';
import { ListarTurnos } from '../domain/usecases/ListarTurnos';
import { AgendarTurno } from '../domain/usecases/AgendarTurno';
import { GuardarAjustes, ObtenerAjustes } from '../domain/usecases/GuardarAjustes';
import { SincronizarAhora } from '../domain/usecases/SincronizarAhora';

// Singletons de repositorios y servicios (única fuente de verdad)
export const casoRepository = new CasoRepositoryImpl();
export const turnoRepository = new TurnoRepositoryImpl();
export const ajustesRepository = new AjustesRepositoryImpl();
export const authRepository = new SupabaseAuthRepository();
export const recordatorioService = new RecordatoriosNotificaciones();

// Casos de uso
export const listarCasosPorUrgencia = new ListarCasosPorUrgencia(casoRepository);
export const obtenerCasoUseCase = new ObtenerCaso(casoRepository);
export const registrarRescateUseCase = new RegistrarRescate(casoRepository);
export const cambiarEstadoCasoUseCase = new CambiarEstadoCaso(casoRepository);
export const listarTurnosUseCase = new ListarTurnos(turnoRepository);
export const agendarTurnoUseCase = new AgendarTurno(turnoRepository, recordatorioService);
export const obtenerAjustesUseCase = new ObtenerAjustes(ajustesRepository);
export const guardarAjustesUseCase = new GuardarAjustes(ajustesRepository);
export const sincronizarAhoraUseCase = new SincronizarAhora(casoRepository);
