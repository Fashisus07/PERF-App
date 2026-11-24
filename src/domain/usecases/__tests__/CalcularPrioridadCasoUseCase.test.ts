import { CalcularPrioridadCasoUseCase } from '../CalcularPrioridadCasoUseCase';

describe('CalcularPrioridadCasoUseCase (Modelo Multicriterio PERF)', () => {
  const useCase = new CalcularPrioridadCasoUseCase();
  const AHORA = 1700000000000;
  const DIA_MS = 24 * 60 * 60 * 1000;

  test('Caso con gravedad CRITICA recién ingresado (0 días) es URGENTE de forma inmediata', () => {
    const res = useCase.ejecutar(
      {
        estadoCaso: 'EN_TRANSITO',
        gravedadClinica: 'CRITICA',
        vulnerabilidad: 'ESTABLE',
        fechaRescate: AHORA,
      },
      15,
      AHORA
    );

    expect(res.nivelPrioridad).toBe('URGENTE');
    expect(res.motivoUrgencia).toBe('URGENTE • Crítico');
    expect(res.puntajePrioridad).toBe(1000);
    expect(res.esUrgente).toBe(true);
  });

  test('Vulnerabilidad LACTANTE_SIN_MADRE tiene prioridad URGENTE inmediata', () => {
    const res = useCase.ejecutar(
      {
        estadoCaso: 'EN_TRANSITO',
        gravedadClinica: 'LEVE',
        vulnerabilidad: 'LACTANTE_SIN_MADRE',
        fechaRescate: AHORA,
      },
      15,
      AHORA
    );

    expect(res.nivelPrioridad).toBe('URGENTE');
    expect(res.motivoUrgencia).toBe('URGENTE • Lactante sin madre');
    expect(res.puntajePrioridad).toBe(900);
  });

  test('Vulnerabilidad SIN_TRANSITO tiene prioridad URGENTE inmediata', () => {
    const res = useCase.ejecutar(
      {
        estadoCaso: 'EN_TRANSITO',
        gravedadClinica: 'LEVE',
        vulnerabilidad: 'SIN_TRANSITO',
        fechaRescate: AHORA - 2 * DIA_MS,
      },
      15,
      AHORA
    );

    expect(res.nivelPrioridad).toBe('URGENTE');
    expect(res.motivoUrgencia).toBe('URGENTE • Sin tránsito');
    expect(res.puntajePrioridad).toBe(802);
  });

  test('Caso estable que supera el umbral configurable de días pasa a URGENTE', () => {
    const res = useCase.ejecutar(
      {
        estadoCaso: 'EN_TRANSITO',
        gravedadClinica: 'SANA',
        vulnerabilidad: 'ESTABLE',
        fechaRescate: AHORA - 16 * DIA_MS,
      },
      15,
      AHORA
    );

    expect(res.nivelPrioridad).toBe('URGENTE');
    expect(res.motivoUrgencia).toBe('URGENTE • +16 días');
    expect(res.puntajePrioridad).toBe(716);
  });

  test('Caso grave recién ingresado supera en puntaje a un caso estable con muchos días', () => {
    const criticoNuevo = useCase.ejecutar(
      {
        estadoCaso: 'EN_TRANSITO',
        gravedadClinica: 'CRITICA',
        vulnerabilidad: 'ESTABLE',
        fechaRescate: AHORA,
      },
      15,
      AHORA
    );

    const estableViejo = useCase.ejecutar(
      {
        estadoCaso: 'EN_TRANSITO',
        gravedadClinica: 'SANA',
        vulnerabilidad: 'ESTABLE',
        fechaRescate: AHORA - 30 * DIA_MS,
      },
      15,
      AHORA
    );

    expect(criticoNuevo.nivelPrioridad).toBe('URGENTE');
    expect(estableViejo.nivelPrioridad).toBe('URGENTE');
    expect(criticoNuevo.puntajePrioridad).toBeGreaterThan(estableViejo.puntajePrioridad);
  });

  test('Caso moderado se clasifica como ATENCION', () => {
    const res = useCase.ejecutar(
      {
        estadoCaso: 'EN_TRANSITO',
        gravedadClinica: 'MODERADA',
        vulnerabilidad: 'ESTABLE',
        fechaRescate: AHORA,
      },
      15,
      AHORA
    );

    expect(res.nivelPrioridad).toBe('ATENCION');
    expect(res.motivoUrgencia).toBe('ATENCIÓN • Moderado');
    expect(res.puntajePrioridad).toBe(500);
    expect(res.esUrgente).toBe(false);
  });

  test('Caso en tratamiento médico activo se clasifica como ATENCION', () => {
    const res = useCase.ejecutar(
      {
        estadoCaso: 'EN_TRANSITO',
        gravedadClinica: 'LEVE',
        vulnerabilidad: 'EN_TRATAMIENTO',
        fechaRescate: AHORA - 1 * DIA_MS,
      },
      15,
      AHORA
    );

    expect(res.nivelPrioridad).toBe('ATENCION');
    expect(res.motivoUrgencia).toBe('ATENCIÓN • En tratamiento');
    expect(res.puntajePrioridad).toBe(451);
  });

  test('Caso que alcanza el 70% del umbral de días pasa a ATENCION', () => {
    // 70% de 15 = ceil(10.5) = 11 días
    const res = useCase.ejecutar(
      {
        estadoCaso: 'EN_TRANSITO',
        gravedadClinica: 'SANA',
        vulnerabilidad: 'ESTABLE',
        fechaRescate: AHORA - 11 * DIA_MS,
      },
      15,
      AHORA
    );

    expect(res.nivelPrioridad).toBe('ATENCION');
    expect(res.motivoUrgencia).toBe('ATENCIÓN • 11 días en espera');
    expect(res.puntajePrioridad).toBe(411);
  });

  test('Caso estable y reciente se clasifica como AL_DIA', () => {
    const res = useCase.ejecutar(
      {
        estadoCaso: 'EN_TRANSITO',
        gravedadClinica: 'SANA',
        vulnerabilidad: 'ESTABLE',
        fechaRescate: AHORA - 3 * DIA_MS,
      },
      15,
      AHORA
    );

    expect(res.nivelPrioridad).toBe('AL_DIA');
    expect(res.motivoUrgencia).toBe('Al día');
    expect(res.puntajePrioridad).toBe(97);
    expect(res.esUrgente).toBe(false);
  });

  test('Casos en estado ADOPTADO o FALLECIDO nunca se computan como urgentes', () => {
    const adoptadoGrave = useCase.ejecutar(
      {
        estadoCaso: 'ADOPTADO',
        gravedadClinica: 'CRITICA',
        vulnerabilidad: 'LACTANTE_SIN_MADRE',
        fechaRescate: AHORA - 50 * DIA_MS,
      },
      15,
      AHORA
    );

    const fallecido = useCase.ejecutar(
      {
        estadoCaso: 'FALLECIDO',
        gravedadClinica: 'CRITICA',
        vulnerabilidad: 'SIN_TRANSITO',
        fechaRescate: AHORA - 30 * DIA_MS,
      },
      15,
      AHORA
    );

    expect(adoptadoGrave.nivelPrioridad).toBe('AL_DIA');
    expect(adoptadoGrave.esUrgente).toBe(false);
    expect(adoptadoGrave.puntajePrioridad).toBe(0);

    expect(fallecido.nivelPrioridad).toBe('AL_DIA');
    expect(fallecido.esUrgente).toBe(false);
    expect(fallecido.puntajePrioridad).toBe(0);
  });

  test('Respeta un umbral de días personalizado (ej. 7 días)', () => {
    const res = useCase.ejecutar(
      {
        estadoCaso: 'EN_TRANSITO',
        gravedadClinica: 'LEVE',
        vulnerabilidad: 'ESTABLE',
        fechaRescate: AHORA - 8 * DIA_MS,
      },
      7,
      AHORA
    );

    expect(res.nivelPrioridad).toBe('URGENTE');
    expect(res.motivoUrgencia).toBe('URGENTE • +8 días');
  });
});
