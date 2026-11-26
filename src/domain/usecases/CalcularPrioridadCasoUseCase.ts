import type { GravedadClinica, NivelPrioridad, Vulnerabilidad } from '../models/Caso';

export interface EntradaCalculoPrioridad {
  estadoCaso: string;
  gravedadClinica?: GravedadClinica;
  vulnerabilidad?: Vulnerabilidad;
  fechaRescate: number;
  /** Última visita, nota o tratamiento del caso. Sin dato, se cuenta desde el rescate. */
  fechaUltimaRevision?: number | null;
}

export interface ResultadoCalculoPrioridad {
  nivelPrioridad: NivelPrioridad;
  motivoUrgencia: string;
  puntajePrioridad: number;
  esUrgente: boolean;
}

export class CalcularPrioridadCasoUseCase {
  /**
   * Calcula el nivel y puntaje de prioridad de un caso según las reglas de negocio de PERF.
   *
   * @param entrada Datos clínicos, vulnerabilidad y fecha de rescate del caso.
   * @param umbralDias Umbral de días configurable (default: 15).
   * @param ahora Timestamp actual en milisegundos (default: Date.now()).
   */
  ejecutar(
    entrada: EntradaCalculoPrioridad,
    umbralDias: number = 15,
    ahora: number = Date.now()
  ): ResultadoCalculoPrioridad {
    const { estadoCaso, fechaRescate, fechaUltimaRevision } = entrada;
    const gravedad = entrada.gravedadClinica ?? 'MODERADA';
    const vulnerabilidad = entrada.vulnerabilidad ?? 'ESTABLE';

    // Regla 1: Casos cerrados (ADOPTADO o FALLECIDO) nunca son urgentes
    if (estadoCaso === 'ADOPTADO' || estadoCaso === 'FALLECIDO') {
      return {
        nivelPrioridad: 'AL_DIA',
        motivoUrgencia: estadoCaso === 'ADOPTADO' ? 'Adoptado' : 'Fallecido',
        puntajePrioridad: 0,
        esUrgente: false,
      };
    }

    // Los días se cuentan desde la última revisión: un caso que alguien visitó hace poco no sube de
    // nivel solo por llevar mucho tiempo en la red. Sin revisiones, desde el rescate.
    const hayRevision = fechaUltimaRevision != null && fechaUltimaRevision > fechaRescate;
    const desde = hayRevision ? (fechaUltimaRevision as number) : fechaRescate;
    const msTranscurridos = Math.max(0, ahora - desde);
    const dias = Math.floor(msTranscurridos / (1000 * 60 * 60 * 24));
    const sufijo = hayRevision ? ' sin revisión' : '';

    // Regla 2: URGENTE (Prioridad 1)
    if (gravedad === 'CRITICA') {
      return {
        nivelPrioridad: 'URGENTE',
        motivoUrgencia: 'URGENTE • Crítico',
        puntajePrioridad: 1000 + dias,
        esUrgente: true,
      };
    }

    if (vulnerabilidad === 'LACTANTE_SIN_MADRE') {
      return {
        nivelPrioridad: 'URGENTE',
        motivoUrgencia: 'URGENTE • Lactante sin madre',
        puntajePrioridad: 900 + dias,
        esUrgente: true,
      };
    }

    if (vulnerabilidad === 'SIN_TRANSITO') {
      return {
        nivelPrioridad: 'URGENTE',
        motivoUrgencia: 'URGENTE • Sin tránsito',
        puntajePrioridad: 800 + dias,
        esUrgente: true,
      };
    }

    if (dias > umbralDias) {
      return {
        nivelPrioridad: 'URGENTE',
        motivoUrgencia: `URGENTE • +${dias} días${sufijo}`,
        puntajePrioridad: 700 + dias,
        esUrgente: true,
      };
    }

    // Regla 3: ATENCIÓN (Prioridad 2)
    if (gravedad === 'MODERADA') {
      return {
        nivelPrioridad: 'ATENCION',
        motivoUrgencia: 'ATENCIÓN • Moderado',
        puntajePrioridad: 500 + dias,
        esUrgente: false,
      };
    }

    if (vulnerabilidad === 'EN_TRATAMIENTO') {
      return {
        nivelPrioridad: 'ATENCION',
        motivoUrgencia: 'ATENCIÓN • En tratamiento',
        puntajePrioridad: 450 + dias,
        esUrgente: false,
      };
    }

    const umbralAtencion = Math.ceil(0.7 * umbralDias);
    if (dias >= umbralAtencion) {
      return {
        nivelPrioridad: 'ATENCION',
        motivoUrgencia: hayRevision ? `ATENCIÓN • ${dias} días sin revisión` : `ATENCIÓN • ${dias} días en espera`,
        puntajePrioridad: 400 + dias,
        esUrgente: false,
      };
    }

    // Regla 4: AL DÍA (Prioridad 3)
    return {
      nivelPrioridad: 'AL_DIA',
      motivoUrgencia: 'Al día',
      puntajePrioridad: Math.max(1, 100 - dias),
      esUrgente: false,
    };
  }
}

export const calcularPrioridadCasoUseCase = new CalcularPrioridadCasoUseCase();
