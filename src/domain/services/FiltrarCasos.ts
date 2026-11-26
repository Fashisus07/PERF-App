import { sigueElCaso, Voluntario } from '../models/Ajustes';
import { Caso, EstadoCaso, Urgencia, prioridadDeCaso } from '../models/Caso';

export type FiltroUrgenciaCasos = 'todos' | Urgencia;
export type FiltroEstadoCasos = 'todos' | EstadoCaso;
export type OrdenListaCasos = 'prioridad' | 'ultimo_rescate' | 'mas_antiguo' | 'ultima_revision';

export interface OpcionesFiltradoCasos {
  busqueda: string;
  filtroUrgencia: FiltroUrgenciaCasos;
  soloMios: boolean;
  estadoFiltro: FiltroEstadoCasos;
  orden: OrdenListaCasos;
  umbralDias: number;
  voluntario: Pick<Voluntario, 'nombre' | 'id'> | null;
}

export interface ConteoUrgenciaCasos {
  todos: number;
  urgente: number;
  atencion: number;
  aldia: number;
}

export interface ResultadoFiltradoCasos {
  visibles: Caso[];
  conteo: ConteoUrgenciaCasos;
  estadosDisponibles: EstadoCaso[];
  cantidadMios: number;
}

/**
 * Función pura que aplica "Mis casos", filtro por estado operativo, conteo por urgencia,
 * búsqueda textual y ordenamiento de la lista de casos.
 */
export function filtrarYOrdenarCasos(
  casos: Caso[],
  opciones: OpcionesFiltradoCasos
): ResultadoFiltradoCasos {
  const { busqueda, filtroUrgencia, soloMios, estadoFiltro, orden, umbralDias, voluntario } = opciones;

  const esCasoMio = (c: Caso) =>
    sigueElCaso(c.quienSigueCaso, voluntario, c.coordinadorPerfilId);

  const cantidadMios = casos.filter(esCasoMio).length;
  const deMios = soloMios ? casos.filter(esCasoMio) : casos;
  const base = estadoFiltro === 'todos' ? deMios : deMios.filter((c) => c.estadoCaso === estadoFiltro);

  const estadosDisponibles = Array.from(new Set(casos.map((c) => c.estadoCaso)));

  const urgencias = new Map<string, Urgencia>();
  for (const c of base) {
    urgencias.set(c.id, prioridadDeCaso(c, umbralDias).urgencia);
  }

  let urgente = 0;
  let atencion = 0;
  let aldia = 0;
  for (const urg of urgencias.values()) {
    if (urg === 'urgente') urgente++;
    else if (urg === 'atencion') atencion++;
    else aldia++;
  }

  const q = busqueda.trim().toLowerCase();
  const filtrados = base.filter((c) => {
    const urg = urgencias.get(c.id)!;
    const cumpleFiltro = filtroUrgencia === 'todos' || urg === filtroUrgencia;
    const cumpleBusqueda =
      !q ||
      c.nombreProvisorio.toLowerCase().includes(q) ||
      c.barrio.toLowerCase().includes(q) ||
      c.quienSigueCaso.toLowerCase().includes(q) ||
      (c.especieDetalle ?? '').toLowerCase().includes(q) ||
      (c.creadoPorNombre ?? '').toLowerCase().includes(q) ||
      (c.relaciones ?? []).some((r) => r.nombreDestino.toLowerCase().includes(q));
    return cumpleFiltro && cumpleBusqueda;
  });

  let visibles = filtrados;
  if (orden === 'ultimo_rescate') {
    visibles = filtrados.slice().sort((a, b) => b.fechaRescate - a.fechaRescate);
  } else if (orden === 'mas_antiguo') {
    visibles = filtrados.slice().sort((a, b) => a.fechaRescate - b.fechaRescate);
  } else if (orden === 'ultima_revision') {
    visibles = filtrados
      .slice()
      .sort((a, b) => (b.fechaUltimaRevision ?? b.updatedAt) - (a.fechaUltimaRevision ?? a.updatedAt));
  }

  return {
    visibles,
    conteo: {
      todos: base.length,
      urgente,
      atencion,
      aldia,
    },
    estadosDisponibles,
    cantidadMios,
  };
}
