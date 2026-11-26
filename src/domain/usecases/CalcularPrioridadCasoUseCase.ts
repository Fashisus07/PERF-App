import {
  FichaSanitariaFelina,
  GravedadClinica,
  NivelPrioridad,
  Vulnerabilidad,
} from '../models/Caso';

const DIA_MS = 1000 * 60 * 60 * 24;

export interface EntradaCalculoPrioridad {
  estadoCaso: string;
  gravedadClinica?: GravedadClinica;
  vulnerabilidad?: Vulnerabilidad;
  fechaRescate: number;
  /** Última visita, nota o tratamiento del caso. Sin dato, se cuenta desde el rescate. */
  fechaUltimaRevision?: number | null;
  sanidad?: Partial<FichaSanitariaFelina>;
}

export interface ResultadoCalculoPrioridad {
  nivelPrioridad: NivelPrioridad;
  motivoUrgencia: string;
  puntajePrioridad: number;
  esUrgente: boolean;
  factoresMedicos: string[];
}

export class CalcularPrioridadCasoUseCase {
  /**
   * Calcula el nivel y puntaje de prioridad de un caso según las reglas de negocio de PERF,
   * integrando estado operativo, gravedad clínica, vulnerabilidad, ficha sanitaria y tiempo de espera
   * desde la última revisión (o desde el rescate si aún no tuvo revisiones).
   *
   * @param entrada Datos clínicos, sanitarios, vulnerabilidad, estado, última revisión y fecha de rescate.
   * @param umbralDias Umbral de días configurable (default: 15).
   * @param ahora Timestamp actual en milisegundos (default: Date.now()).
   */
  ejecutar(
    entrada: EntradaCalculoPrioridad,
    umbralDias: number = 15,
    ahora: number = Date.now()
  ): ResultadoCalculoPrioridad {
    const { estadoCaso, fechaRescate, fechaUltimaRevision, sanidad } = entrada;
    const gravedad = entrada.gravedadClinica ?? 'MODERADA';
    const vulnerabilidad = entrada.vulnerabilidad ?? 'ESTABLE';

    // Regla 1: Casos cerrados (ADOPTADO o FALLECIDO) nunca son urgentes
    if (estadoCaso === 'ADOPTADO' || estadoCaso === 'FALLECIDO') {
      const etiqueta = estadoCaso === 'ADOPTADO' ? 'Adoptado' : 'Fallecido';
      return {
        nivelPrioridad: 'AL_DIA',
        motivoUrgencia: etiqueta,
        puntajePrioridad: 0,
        esUrgente: false,
        factoresMedicos: [`Caso cerrado (${etiqueta})`],
      };
    }

    // Los días se cuentan desde la última revisión: un caso que alguien visitó hace poco no sube de
    // nivel solo por llevar mucho tiempo en la red. Sin revisiones, desde el rescate.
    const hayRevision = fechaUltimaRevision != null && fechaUltimaRevision > fechaRescate;
    const desde = hayRevision ? (fechaUltimaRevision as number) : fechaRescate;
    const msTranscurridos = Math.max(0, ahora - desde);
    const dias = Math.floor(msTranscurridos / DIA_MS);
    const sufijo = hayRevision ? ' sin revisión' : '';
    const factoresMedicos: string[] = [];

    const esEnClinica = estadoCaso === 'EN_CLINICA';
    if (esEnClinica) {
      factoresMedicos.push('Atención en clínica (+50 pts)');
    } else if (estadoCaso === 'PRE_ADOPTADO') {
      factoresMedicos.push('En período de pre-adopción');
    } else if (estadoCaso === 'EN_ADOPCION') {
      factoresMedicos.push('Disponible en adopción');
    }

    // Evaluación de la ficha sanitaria (si está presente)
    let ajusteSanitario = 0;
    const virales = sanidad?.virales;
    const castrado = sanidad?.castrado;
    let tieneDesp1Pendiente = false;
    let tieneDesp2Vencida = false;

    if (sanidad) {
      if (virales === 'AMBOS_POSITIVOS') {
        ajusteSanitario += 45;
        factoresMedicos.push('VIF + ViLeF Positivo (+45 pts)');
      } else if (virales === 'VILEF_POSITIVO') {
        ajusteSanitario += 35;
        factoresMedicos.push('ViLeF Positivo (+35 pts)');
      } else if (virales === 'VIF_POSITIVO') {
        ajusteSanitario += 25;
        factoresMedicos.push('VIF Positivo (+25 pts)');
      } else if (virales === 'PENDIENTE') {
        ajusteSanitario += 15;
        factoresMedicos.push('Test viral VIF/ViLeF pendiente (+15 pts)');
      } else if (virales === 'NEGATIVO') {
        factoresMedicos.push('Virales negativo');
      }

      if (castrado === 'NO' || castrado === 'PENDIENTE') {
        ajusteSanitario += 10;
        factoresMedicos.push(castrado === 'NO' ? 'No castrado (+10 pts)' : 'Castración pendiente (+10 pts)');
      } else if (castrado === 'SI') {
        factoresMedicos.push('Castrado');
      }

      if (!sanidad.fechaPrimeraDesparasitacion) {
        ajusteSanitario += 8;
        tieneDesp1Pendiente = true;
        factoresMedicos.push('1° desparasitación pendiente (+8 pts)');
      } else if (!sanidad.fechaSegundaDesparasitacion) {
        const diasDesdeDesp1 = Math.floor(Math.max(0, ahora - sanidad.fechaPrimeraDesparasitacion) / DIA_MS);
        if (diasDesdeDesp1 >= 14) {
          ajusteSanitario += 6;
          tieneDesp2Vencida = true;
          factoresMedicos.push('2° desparasitación vencida (+6 pts)');
        } else {
          ajusteSanitario += 2;
          factoresMedicos.push('2° desparasitación en término (+2 pts)');
        }
      } else {
        factoresMedicos.push('Desparasitación completa');
      }
    }

    const bonusClinica = esEnClinica ? 50 : 0;

    // Regla 2: URGENTE (Prioridad 1)
    if (gravedad === 'CRITICA') {
      factoresMedicos.unshift('Gravedad clínica crítica');
      return {
        nivelPrioridad: 'URGENTE',
        motivoUrgencia: esEnClinica ? 'URGENTE • Crítico en clínica' : 'URGENTE • Crítico',
        puntajePrioridad: 1000 + dias + ajusteSanitario + bonusClinica,
        esUrgente: true,
        factoresMedicos,
      };
    }

    if (vulnerabilidad === 'LACTANTE_SIN_MADRE') {
      factoresMedicos.unshift('Lactante sin madre');
      return {
        nivelPrioridad: 'URGENTE',
        motivoUrgencia: 'URGENTE • Lactante sin madre',
        puntajePrioridad: 900 + dias + ajusteSanitario + bonusClinica,
        esUrgente: true,
        factoresMedicos,
      };
    }

    if (virales === 'AMBOS_POSITIVOS') {
      return {
        nivelPrioridad: 'URGENTE',
        motivoUrgencia: 'URGENTE • VIF + ViLeF Positivo',
        puntajePrioridad: 850 + dias + ajusteSanitario + bonusClinica,
        esUrgente: true,
        factoresMedicos,
      };
    }

    if (virales === 'VILEF_POSITIVO') {
      return {
        nivelPrioridad: 'URGENTE',
        motivoUrgencia: 'URGENTE • ViLeF Positivo',
        puntajePrioridad: 830 + dias + ajusteSanitario + bonusClinica,
        esUrgente: true,
        factoresMedicos,
      };
    }

    if (vulnerabilidad === 'SIN_TRANSITO') {
      factoresMedicos.unshift('Sin hogar de tránsito asignado');
      return {
        nivelPrioridad: 'URGENTE',
        motivoUrgencia: 'URGENTE • Sin tránsito',
        puntajePrioridad: 800 + dias + ajusteSanitario + bonusClinica,
        esUrgente: true,
        factoresMedicos,
      };
    }

    if (dias > umbralDias) {
      factoresMedicos.unshift(`Superó umbral de espera (${dias}/${umbralDias} días${sufijo})`);
      return {
        nivelPrioridad: 'URGENTE',
        motivoUrgencia: `URGENTE • +${dias} días${sufijo}`,
        puntajePrioridad: 700 + dias + ajusteSanitario + bonusClinica,
        esUrgente: true,
        factoresMedicos,
      };
    }

    // Regla 3: ATENCIÓN (Prioridad 2)
    if (esEnClinica) {
      return {
        nivelPrioridad: 'ATENCION',
        motivoUrgencia: 'ATENCIÓN • En clínica',
        puntajePrioridad: 550 + dias + ajusteSanitario,
        esUrgente: false,
        factoresMedicos,
      };
    }

    if (gravedad === 'MODERADA') {
      factoresMedicos.unshift('Gravedad clínica moderada');
      return {
        nivelPrioridad: 'ATENCION',
        motivoUrgencia: 'ATENCIÓN • Moderado',
        puntajePrioridad: 500 + dias + ajusteSanitario,
        esUrgente: false,
        factoresMedicos,
      };
    }

    if (virales === 'VIF_POSITIVO') {
      return {
        nivelPrioridad: 'ATENCION',
        motivoUrgencia: 'ATENCIÓN • VIF Positivo',
        puntajePrioridad: 480 + dias + ajusteSanitario,
        esUrgente: false,
        factoresMedicos,
      };
    }

    if (vulnerabilidad === 'EN_TRATAMIENTO') {
      factoresMedicos.unshift('En tratamiento médico activo');
      return {
        nivelPrioridad: 'ATENCION',
        motivoUrgencia: 'ATENCIÓN • En tratamiento',
        puntajePrioridad: 450 + dias + ajusteSanitario,
        esUrgente: false,
        factoresMedicos,
      };
    }

    const umbralAtencion = Math.ceil(0.7 * umbralDias);
    if (dias >= umbralAtencion) {
      factoresMedicos.unshift(`Próximo al umbral (${dias}/${umbralDias} días${sufijo})`);
      return {
        nivelPrioridad: 'ATENCION',
        motivoUrgencia: hayRevision ? `ATENCIÓN • ${dias} días sin revisión` : `ATENCIÓN • ${dias} días en espera`,
        puntajePrioridad: 400 + dias + ajusteSanitario,
        esUrgente: false,
        factoresMedicos,
      };
    }

    if (virales === 'PENDIENTE') {
      return {
        nivelPrioridad: 'ATENCION',
        motivoUrgencia: 'ATENCIÓN • Test viral pendiente',
        puntajePrioridad: 320 + dias + ajusteSanitario,
        esUrgente: false,
        factoresMedicos,
      };
    }

    if (castrado === 'NO' || castrado === 'PENDIENTE') {
      return {
        nivelPrioridad: 'ATENCION',
        motivoUrgencia: 'ATENCIÓN • Castración pendiente',
        puntajePrioridad: 310 + dias + ajusteSanitario,
        esUrgente: false,
        factoresMedicos,
      };
    }

    if (tieneDesp1Pendiente) {
      return {
        nivelPrioridad: 'ATENCION',
        motivoUrgencia: 'ATENCIÓN • Desparasitación pendiente',
        puntajePrioridad: 300 + dias + ajusteSanitario,
        esUrgente: false,
        factoresMedicos,
      };
    }

    if (tieneDesp2Vencida) {
      return {
        nivelPrioridad: 'ATENCION',
        motivoUrgencia: 'ATENCIÓN • 2° desparasitación pendiente',
        puntajePrioridad: 290 + dias + ajusteSanitario,
        esUrgente: false,
        factoresMedicos,
      };
    }

    // Regla 4: AL DÍA (Prioridad 3)
    if (gravedad === 'LEVE') {
      factoresMedicos.unshift('Observación clínica leve');
      return {
        nivelPrioridad: 'AL_DIA',
        motivoUrgencia: 'Al día • Seguimiento leve',
        puntajePrioridad: Math.max(1, 120 - dias) + ajusteSanitario,
        esUrgente: false,
        factoresMedicos,
      };
    }

    factoresMedicos.unshift('Condición clínica sana y estable');
    return {
      nivelPrioridad: 'AL_DIA',
      motivoUrgencia: 'Al día',
      puntajePrioridad: Math.max(1, 100 - dias) + ajusteSanitario,
      esUrgente: false,
      factoresMedicos,
    };
  }
}

export const calcularPrioridadCasoUseCase = new CalcularPrioridadCasoUseCase();
