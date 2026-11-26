import { calcularUrgencia, Caso, prioridadDeCaso, UMBRAL_URGENTE_DIAS } from '../Caso';

const DIA = 24 * 60 * 60 * 1000;

// Un caso "estable" con el nivel guardado en Al día: lo que quedó calculado el día del rescate.
const caso = (diasDeEspera: number, extra: Partial<Caso> = {}): Partial<Caso> => ({
  estadoCaso: 'EN_TRANSITO',
  gravedadClinica: 'LEVE',
  vulnerabilidad: 'ESTABLE',
  nivelPrioridad: 'AL_DIA',
  motivoUrgencia: 'Al día',
  puntajePrioridad: 100,
  fechaRescate: Date.now() - diasDeEspera * DIA - 1000,
  ...extra,
});

describe('Prioridad de un caso: una sola regla', () => {
  test('se calcula hoy: un caso que pasa el umbral se vuelve urgente aunque lo guardado diga Al día', () => {
    expect(prioridadDeCaso(caso(2)).urgencia).toBe('aldia');
    const viejo = prioridadDeCaso(caso(UMBRAL_URGENTE_DIAS + 1));
    expect(viejo.urgencia).toBe('urgente');
    expect(viejo.motivoUrgencia).toBe(`URGENTE • +${UMBRAL_URGENTE_DIAS + 1} días`);
  });

  test('respeta el umbral de Ajustes', () => {
    // Atención desde el 70% del umbral (redondeado hacia arriba); urgente al pasarlo.
    expect(prioridadDeCaso(caso(11), 15).urgencia).toBe('atencion');
    expect(prioridadDeCaso(caso(11), 5).urgencia).toBe('urgente');
    expect(prioridadDeCaso(caso(11), 30).urgencia).toBe('aldia');
  });

  test('calcularUrgencia da siempre el mismo nivel que prioridadDeCaso', () => {
    const casos = [
      caso(1),
      caso(12),
      caso(30),
      caso(1, { gravedadClinica: 'CRITICA' }),
      caso(1, { gravedadClinica: 'MODERADA' }),
      caso(1, { vulnerabilidad: 'LACTANTE_SIN_MADRE' }),
      caso(1, { vulnerabilidad: 'SIN_TRANSITO' }),
      caso(1, { vulnerabilidad: 'EN_TRATAMIENTO' }),
      caso(40, { estadoCaso: 'ADOPTADO' }),
    ];
    for (const umbral of [5, 10, 15, 30]) {
      for (const c of casos) {
        expect(calcularUrgencia(c, umbral)).toBe(prioridadDeCaso(c, umbral).urgencia);
      }
    }
  });

  test('un caso cerrado nunca es urgente, por mucho que haya esperado', () => {
    expect(prioridadDeCaso(caso(90, { estadoCaso: 'FALLECIDO', gravedadClinica: 'CRITICA' })).urgencia).toBe('aldia');
  });

  test('sin gravedad ni vulnerabilidad se toma como moderado y estable', () => {
    expect(prioridadDeCaso({ estadoCaso: 'EN_TRANSITO', fechaRescate: Date.now() }).urgencia).toBe('atencion');
  });
});
