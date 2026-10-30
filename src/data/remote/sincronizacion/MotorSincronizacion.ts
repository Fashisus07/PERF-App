import type { Caso, EventoHistorial } from '../../../domain/models/Caso';
import type { Turno } from '../../../domain/models/Turno';
import {
  Comparable,
  FilaServidor,
  camposComparables,
  casoDesdeServidor,
  diferenciasCaso,
  eventoDesdeServidor,
  filaCasoParaServidor,
  filaEventoParaServidor,
  filaTurnoParaServidor,
  turnoDesdeServidor,
} from './mapeo';

// Motor de sincronización Offline First: sube la cola operación por operación, baja los cambios
// del servidor y guarda lo que cada dispositivo ya sabe. No conoce React Native ni Supabase:
// recibe el servidor, el almacenamiento local y el estado como dependencias.

export interface OperacionCola {
  id: number;
  entidad: 'CASO' | 'TURNO' | 'HISTORIAL';
  operacion: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: string;
  reintentos: number;
  createdAt: number;
}

/** Sin conexión o servidor inalcanzable: se corta la sincronización y la cola queda intacta. */
export class ErrorDeRed extends Error {}
/** El caso no existe en el servidor (se subió desde otro lugar o nunca se creó). */
export class ErrorCasoInexistente extends Error {}
export class ErrorSinSesion extends Error {
  constructor() {
    super('Iniciá sesión para sincronizar.');
  }
}

export interface ServidorRemoto {
  haySesion(): Promise<boolean>;
  insertarCaso(fila: FilaServidor): Promise<'creado' | 'existia'>;
  obtenerCaso(id: string): Promise<FilaServidor | null>;
  aplicarCambiosCaso(
    id: string,
    cambios: FilaServidor,
    camposTs: Record<string, number>,
    baseIso: string,
  ): Promise<{ aplicados: string[]; conflictos: string[] }>;
  insertarEvento(fila: FilaServidor): Promise<'creado' | 'existia'>;
  insertarTurno(fila: FilaServidor): Promise<'creado' | 'existia'>;
  marcarTurnoCumplido(id: string): Promise<void>;
  borrarTurno(id: string): Promise<void>;
  idsCentros(): Promise<Set<string>>;
  listarCasos(): Promise<FilaServidor[]>;
  listarEventos(): Promise<FilaServidor[]>;
  listarTurnos(): Promise<FilaServidor[]>;
}

export interface AlmacenLocal {
  leerCola(): Promise<OperacionCola[]>;
  quitarDeCola(id: number): Promise<void>;
  registrarFallo(id: number): Promise<void>;
  obtenerCaso(id: string): Promise<Caso | undefined>;
  guardarCaso(caso: Caso): Promise<void>;
  guardarEvento(evento: EventoHistorial): Promise<void>;
  guardarTurno(turno: Turno): Promise<void>;
}

export interface EstadoSync {
  leerBases(): Promise<Record<string, Comparable>>;
  guardarBases(bases: Record<string, Comparable>): Promise<void>;
  leerUltimaSync(): Promise<number | null>;
  guardarUltimaSync(ms: number): Promise<void>;
}

export interface ResultadoSync {
  enviadas: number;
  descargadas: number;
  /** "casoId:campo" de cada campo que otro voluntario también había cambiado. */
  conflictos: string[];
  fallidas: number;
}

export interface Dependencias {
  servidor: ServidorRemoto;
  almacen: AlmacenLocal;
  estado: EstadoSync;
  ahora?: () => number;
}

export async function sincronizar({ servidor, almacen, estado, ahora = Date.now }: Dependencias): Promise<ResultadoSync> {
  if (!(await servidor.haySesion())) throw new ErrorSinSesion();

  const inicio = ahora();
  const bases = await estado.leerBases();
  const ultimaSync = (await estado.leerUltimaSync()) ?? 0;
  const resultado: ResultadoSync = { enviadas: 0, descargadas: 0, conflictos: [], fallidas: 0 };

  // ── 1. Subir la cola, en orden. Cada operación se saca de la cola recién cuando el servidor la aceptó. ──
  const centros = await servidor.idsCentros();
  for (const op of await almacen.leerCola()) {
    try {
      await subirOperacion(op, { servidor, almacen, bases, centros, ultimaSync, resultado });
      await almacen.quitarDeCola(op.id);
      resultado.enviadas++;
    } catch (e) {
      if (e instanceof ErrorDeRed) {
        await estado.guardarBases(bases);
        throw e;
      }
      resultado.fallidas++;
      await almacen.registrarFallo(op.id);
      console.warn(`[sync] ${op.entidad} ${op.operacion} #${op.id} falló:`, (e as Error).message);
    }
  }

  // ── 2. Bajar el estado del servidor, salvo lo que todavía tiene cambios sin subir. ──
  const pendientes = await almacen.leerCola();
  const casosPendientes = new Set<string>();
  const turnosPendientes = new Set<string>();
  for (const op of pendientes) {
    const p = JSON.parse(op.payload);
    if (op.entidad === 'CASO' && p.id) casosPendientes.add(p.id);
    if (op.entidad === 'TURNO' && p.id) turnosPendientes.add(p.id);
    if (op.entidad === 'HISTORIAL' && p.casoId) casosPendientes.add(p.casoId);
  }

  for (const fila of await servidor.listarCasos()) {
    if (casosPendientes.has(fila.id)) continue;
    const caso = casoDesdeServidor(fila);
    await almacen.guardarCaso(caso);
    bases[caso.id] = camposComparables(caso);
    resultado.descargadas++;
  }
  for (const fila of await servidor.listarEventos()) {
    if (casosPendientes.has(fila.caso_id)) continue;
    await almacen.guardarEvento(eventoDesdeServidor(fila));
  }
  for (const fila of await servidor.listarTurnos()) {
    if (turnosPendientes.has(fila.id) || casosPendientes.has(fila.caso_id)) continue;
    await almacen.guardarTurno(turnoDesdeServidor(fila));
  }

  await estado.guardarBases(bases);
  await estado.guardarUltimaSync(inicio);
  return resultado;
}

interface ContextoSubida {
  servidor: ServidorRemoto;
  almacen: AlmacenLocal;
  bases: Record<string, Comparable>;
  centros: Set<string>;
  ultimaSync: number;
  resultado: ResultadoSync;
}

async function subirOperacion(op: OperacionCola, ctx: ContextoSubida): Promise<void> {
  const { servidor, almacen, bases, centros, ultimaSync, resultado } = ctx;
  const payload = JSON.parse(op.payload);

  switch (`${op.entidad}:${op.operacion}`) {
    case 'CASO:CREATE': {
      const caso = payload as Caso;
      await servidor.insertarCaso(filaCasoParaServidor(caso)); // 'existia' = reintento ya aplicado
      bases[caso.id] = camposComparables(caso);
      return;
    }

    case 'CASO:UPDATE': {
      const id: string = payload.id;
      let base = bases[id];
      if (!base) {
        const fila = await servidor.obtenerCaso(id);
        if (!fila) {
          // Caso que solo existe en este teléfono: se sube completo.
          const local = await almacen.obtenerCaso(id);
          if (!local) throw new Error(`El caso ${id} no existe ni local ni en el servidor.`);
          await servidor.insertarCaso(filaCasoParaServidor(local));
          bases[id] = camposComparables(local);
          return;
        }
        base = camposComparables(casoDesdeServidor(fila));
      }

      const dif = diferenciasCaso(payload, base, op.createdAt);
      if (Object.keys(dif.cambios).length === 0) {
        bases[id] = base;
        return;
      }
      try {
        const r = await servidor.aplicarCambiosCaso(id, dif.cambios, dif.camposTs, new Date(ultimaSync).toISOString());
        resultado.conflictos.push(...r.conflictos.map((campo) => `${id}:${campo}`));
      } catch (e) {
        if (!(e instanceof ErrorCasoInexistente)) throw e;
        const local = await almacen.obtenerCaso(id);
        if (!local) throw e;
        await servidor.insertarCaso(filaCasoParaServidor(local));
      }
      // Lo enviado pasa a ser lo último que sabemos: la próxima operación solo manda lo nuevo.
      bases[id] = { ...base, ...dif.nuevosValores };
      return;
    }

    case 'HISTORIAL:CREATE':
      await servidor.insertarEvento(filaEventoParaServidor(payload as EventoHistorial));
      return;

    case 'TURNO:CREATE': {
      const turno = payload as Turno;
      const conocido = !!turno.centroVeterinarioId && centros.has(turno.centroVeterinarioId);
      await servidor.insertarTurno(filaTurnoParaServidor(turno, conocido));
      return;
    }
    case 'TURNO:UPDATE':
      if (payload.cumplido) await servidor.marcarTurnoCumplido(payload.id);
      return;
    case 'TURNO:DELETE':
      await servidor.borrarTurno(payload.id);
      return;

    default:
      throw new Error(`Operación no soportada: ${op.entidad} ${op.operacion}`);
  }
}
