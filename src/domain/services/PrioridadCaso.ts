import type { Urgencia } from '../models/Caso';
import type { Pendiente, TipoPendiente } from '../models/Animal';

export type Gravedad = 'critico' | 'urgente' | 'estable';

export interface EntradaPrioridad {
  gravedad: Gravedad;
  pendientes: Pick<Pendiente, 'tipo' | 'resuelto'>[];
  diasEnAdopcion?: number;
}

export interface ResultadoPrioridad {
  puntaje: number;
  nivel: Urgencia;
}

// Los pesos son una primera propuesta: hay que validarlos con el refugio.
const PUNTOS_GRAVEDAD: Record<Gravedad, number> = { critico: 100, urgente: 60, estable: 0 };

const PUNTOS_PENDIENTE: Record<TipoPendiente, number> = {
  CIRUGIA: 20,
  ESPECIALISTA: 15,
  ESTUDIO: 10,
  CASTRACION: 5,
  OTRO: 0,
};

/** Tope del aporte de la espera en adopción: no puede tapar a un caso clínico. */
const TOPE_ESPERA = 10;
const DIAS_POR_PUNTO_ESPERA = 15;

/**
 * Prioridad de un caso según la necesidad del rescate. Reemplaza al criterio
 * por días desde el rescate: un animal recién encontrado y grave sale arriba.
 * La espera larga en adopción es otra urgencia (no clínica) y solo desempata.
 * Devuelve los mismos niveles que `calcularUrgencia` de Caso.ts.
 */
export function calcularPrioridad(entrada: EntradaPrioridad): ResultadoPrioridad {
  const puntosPendientes = entrada.pendientes
    .filter((p) => !p.resuelto)
    .reduce((suma, p) => suma + PUNTOS_PENDIENTE[p.tipo], 0);
  const puntosEspera = Math.min(
    TOPE_ESPERA,
    Math.floor(Math.max(0, entrada.diasEnAdopcion ?? 0) / DIAS_POR_PUNTO_ESPERA),
  );
  const puntaje = PUNTOS_GRAVEDAD[entrada.gravedad] + puntosPendientes + puntosEspera;

  const nivel: Urgencia = puntaje >= 60 ? 'urgente' : puntaje >= 20 ? 'atencion' : 'aldia';
  return { puntaje, nivel };
}
