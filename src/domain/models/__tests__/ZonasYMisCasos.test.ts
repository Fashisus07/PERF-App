import {
  ETIQUETA_ROL,
  esAdministrador,
  esMiCaso,
  idDeCreadorValido,
  sigueElCaso,
  ZONAS_DISPONIBLES,
  zonasATexto,
  zonasDesdeTexto,
} from '../Ajustes';

describe('Zonas del voluntario (se guardan en una sola columna de texto, separadas por coma)', () => {
  test('hay 23 zonas, sin repetidas', () => {
    expect(ZONAS_DISPONIBLES).toHaveLength(23);
    expect(new Set(ZONAS_DISPONIBLES).size).toBe(ZONAS_DISPONIBLES.length);
  });

  test('ninguna zona lleva coma: si no, al guardar y leer se partiría en dos', () => {
    for (const zona of ZONAS_DISPONIBLES) expect(zona).not.toContain(',');
  });

  test('zonasDesdeTexto separa por coma, saca espacios y descarta vacíos', () => {
    expect(zonasDesdeTexto('Caballito, Almagro')).toEqual(['Caballito', 'Almagro']);
    expect(zonasDesdeTexto('  Palermo ,  Flores  ,, ')).toEqual(['Palermo', 'Flores']);
  });

  test('sin zonas (null, undefined o texto vacío) da una lista vacía', () => {
    expect(zonasDesdeTexto(null)).toEqual([]);
    expect(zonasDesdeTexto(undefined)).toEqual([]);
    expect(zonasDesdeTexto('')).toEqual([]);
    expect(zonasDesdeTexto('   ')).toEqual([]);
  });

  test('zonasATexto une con coma y espacio, sin repetidas ni vacías', () => {
    expect(zonasATexto(['Caballito', 'Almagro'])).toBe('Caballito, Almagro');
    expect(zonasATexto(['Flores', 'Flores', ' Flores '])).toBe('Flores');
    expect(zonasATexto(['', '  ', 'Boedo'])).toBe('Boedo');
    expect(zonasATexto([])).toBe('');
  });

  test('guardar y volver a leer devuelve las mismas zonas, en el mismo orden', () => {
    const elegidas = ['Zona Norte (GBA)', 'Villa Crespo', 'Núñez'];
    expect(zonasDesdeTexto(zonasATexto(elegidas))).toEqual(elegidas);
  });

  test('se pueden guardar y leer todas las zonas a la vez', () => {
    const todas = [...ZONAS_DISPONIBLES];
    expect(zonasDesdeTexto(zonasATexto(todas))).toEqual(todas);
  });
});

describe('"Mis casos": un caso es del voluntario si lo sigue por su nombre', () => {
  const voluntario = { nombre: 'Camila Pérez' };

  test('coincide con el nombre completo', () => {
    expect(sigueElCaso('Camila Pérez', voluntario)).toBe(true);
  });

  test('coincide con el primer nombre', () => {
    expect(sigueElCaso('Camila', voluntario)).toBe(true);
  });

  test('no distingue mayúsculas ni espacios de más', () => {
    expect(sigueElCaso('  camila  ', voluntario)).toBe(true);
    expect(sigueElCaso('CAMILA PÉREZ', voluntario)).toBe(true);
  });

  test('un nombre distinto no coincide', () => {
    expect(sigueElCaso('Martu', voluntario)).toBe(false);
    expect(sigueElCaso('Pérez', voluntario)).toBe(false);
  });

  test('un diminutivo no coincide con el nombre completo (hoy se compara por texto, no por ID)', () => {
    // "Cami" (el coordinador de PERF) no es "Camila": por eso falta el coordinador como registro con ID.
    expect(sigueElCaso('Cami', voluntario)).toBe(false);
  });

  test('limitación conocida: otra persona con el mismo primer nombre también coincide', () => {
    expect(sigueElCaso('Camila', { nombre: 'Camila Gómez' })).toBe(true);
    expect(sigueElCaso('Camila', voluntario)).toBe(true);
  });

  test('un caso sin responsable, o sin voluntario en sesión, no es de nadie', () => {
    expect(sigueElCaso('', voluntario)).toBe(false);
    expect(sigueElCaso('   ', voluntario)).toBe(false);
    expect(sigueElCaso('Camila', null)).toBe(false);
    expect(sigueElCaso('Camila', { nombre: '' })).toBe(false);
  });
});

describe('Roles: un único administrador', () => {
  test('en la base se llama coordinador y en la app se muestra como Administrador', () => {
    expect(ETIQUETA_ROL.coordinador).toBe('Administrador');
    expect(ETIQUETA_ROL.voluntario).toBe('Voluntario');
  });

  test('solo el rol coordinador es administrador', () => {
    expect(esAdministrador('coordinador')).toBe(true);
    expect(esAdministrador('voluntario')).toBe(false);
    expect(esAdministrador(null)).toBe(false);
    expect(esAdministrador(undefined)).toBe(false);
  });
});

describe('"Mis casos": también los que cargó el voluntario', () => {
  const yo = { id: '11111111-2222-3333-4444-555555555555', nombre: 'Camila Pérez' };

  test('un caso que cargué yo es mío aunque el responsable sea otro coordinador', () => {
    expect(esMiCaso({ quienSigueCaso: 'Cami', creadoPorUserId: yo.id }, yo)).toBe(true);
  });

  test('un caso donde figuro como responsable es mío aunque lo haya cargado otra persona', () => {
    expect(esMiCaso({ quienSigueCaso: 'Camila', creadoPorUserId: 'otro' }, yo)).toBe(true);
  });

  test('un caso que cargó otra persona y sigue otro no es mío', () => {
    expect(esMiCaso({ quienSigueCaso: 'Cami', creadoPorUserId: '99999999-2222-3333-4444-555555555555' }, yo)).toBe(false);
    expect(esMiCaso({ quienSigueCaso: 'Cami' }, yo)).toBe(false);
  });

  test('sin voluntario en sesión no hay casos propios', () => {
    expect(esMiCaso({ quienSigueCaso: 'Cami', creadoPorUserId: yo.id }, null)).toBe(false);
  });

  test('el id de la sesión demo no es un uuid: no se manda como creador al servidor', () => {
    expect(idDeCreadorValido('voluntario-1')).toBe(false);
    expect(idDeCreadorValido(undefined)).toBe(false);
    expect(idDeCreadorValido(yo.id)).toBe(true);
  });
});
