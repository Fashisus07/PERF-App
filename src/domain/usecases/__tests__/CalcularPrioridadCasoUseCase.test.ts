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

  describe('última revisión', () => {
    const base = { estadoCaso: 'EN_TRANSITO', gravedadClinica: 'LEVE' as const, vulnerabilidad: 'ESTABLE' as const };

    test('sin revisiones los días se cuentan desde el rescate (igual que antes)', () => {
      const res = useCase.ejecutar({ ...base, fechaRescate: AHORA - 20 * DIA_MS }, 15, AHORA);
      expect(res.nivelPrioridad).toBe('URGENTE');
      expect(res.motivoUrgencia).toBe('URGENTE • +20 días');
    });

    test('el evento de llegada (misma fecha del rescate) no cambia nada', () => {
      const rescate = AHORA - 20 * DIA_MS;
      const res = useCase.ejecutar({ ...base, fechaRescate: rescate, fechaUltimaRevision: rescate }, 15, AHORA);
      expect(res.motivoUrgencia).toBe('URGENTE • +20 días');
    });

    test('un caso viejo pero revisado hace poco no es urgente por los días', () => {
      const res = useCase.ejecutar(
        { ...base, fechaRescate: AHORA - 40 * DIA_MS, fechaUltimaRevision: AHORA - 2 * DIA_MS },
        15,
        AHORA
      );
      expect(res.nivelPrioridad).toBe('AL_DIA');
    });

    test('pasa a atención y luego a urgente según los días sin revisión', () => {
      const entrada = (diasSinRevision: number) => ({
        ...base,
        fechaRescate: AHORA - 60 * DIA_MS,
        fechaUltimaRevision: AHORA - diasSinRevision * DIA_MS,
      });
      const atencion = useCase.ejecutar(entrada(11), 15, AHORA);
      expect(atencion.nivelPrioridad).toBe('ATENCION');
      expect(atencion.motivoUrgencia).toBe('ATENCIÓN • 11 días sin revisión');
      const urgente = useCase.ejecutar(entrada(16), 15, AHORA);
      expect(urgente.nivelPrioridad).toBe('URGENTE');
      expect(urgente.motivoUrgencia).toBe('URGENTE • +16 días sin revisión');
    });

    test('revisar un caso lo baja en la lista: menos puntos que otro igual sin revisar', () => {
      const sinRevisar = useCase.ejecutar({ ...base, fechaRescate: AHORA - 30 * DIA_MS }, 15, AHORA);
      const revisado = useCase.ejecutar(
        { ...base, fechaRescate: AHORA - 30 * DIA_MS, fechaUltimaRevision: AHORA - DIA_MS },
        15,
        AHORA
      );
      expect(revisado.puntajePrioridad).toBeLessThan(sinRevisar.puntajePrioridad);
    });

    test('la gravedad crítica sigue siendo urgente aunque se haya revisado hoy', () => {
      const res = useCase.ejecutar(
        { ...base, gravedadClinica: 'CRITICA', fechaRescate: AHORA - 5 * DIA_MS, fechaUltimaRevision: AHORA },
        15,
        AHORA
      );
      expect(res.nivelPrioridad).toBe('URGENTE');
    });
  });
});
