const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

jest.mock('../../../../assets/images/logo.png', () => 'logo.png', { virtual: true });
jest.mock('../../../../assets/images/login-gato.jpg', () => 'login-gato.jpg', { virtual: true });
jest.mock('../../../../assets/images/casos/canela.jpg', () => 'canela.jpg', { virtual: true });
jest.mock('../../../../assets/images/casos/luna.jpg', () => 'luna.jpg', { virtual: true });
jest.mock('../../../../assets/images/casos/misho.jpg', () => 'misho.jpg', { virtual: true });
jest.mock('../../../../assets/images/casos/oreo.jpg', () => 'oreo.jpg', { virtual: true });
jest.mock('../../../../assets/images/casos/pelusa.jpg', () => 'pelusa.jpg', { virtual: true });
jest.mock('../../../../assets/images/casos/tigre.jpg', () => 'tigre.jpg', { virtual: true });
jest.mock('../../../../assets/images/casos/mora.jpg', () => 'mora.jpg', { virtual: true });
jest.mock('../../../../assets/images/casos/kira.jpg', () => 'kira.jpg', { virtual: true });
jest.mock('../../../../assets/images/casos/toby.jpg', () => 'toby.jpg', { virtual: true });
jest.mock('../../../../assets/images/casos/coco.jpg', () => 'coco.jpg', { virtual: true });

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
  multiRemove: jest.fn(async () => undefined),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: ({ name }: { name: string }) =>
    React.createElement('span', { 'data-icon': name }),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: -34.6037, longitude: -58.3816 },
  })),
  reverseGeocodeAsync: jest.fn(async () => []),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  NavigationContext: React.createContext(null),
  useFocusEffect: () => {},
}));

jest.mock('react-native', () => ({
  ActivityIndicator: () => React.createElement('span', null, 'Cargando'),
  Image: ({ source }: { source?: any }) =>
    React.createElement('img', {
      src: typeof source === 'string' ? source : source?.uri || 'asset',
    }),
  KeyboardAvoidingView: ({ children }: { children?: any }) =>
    React.createElement('div', null, children),
  Platform: {
    OS: 'android',
    select: (obj: Record<string, any>) => obj.android ?? obj.default,
  },
  Pressable: ({ children, disabled, accessibilityLabel, accessibilityRole }: any) =>
    React.createElement(
      'button',
      { disabled: !!disabled, 'aria-label': accessibilityLabel, 'data-role': accessibilityRole },
      typeof children === 'function' ? children({ pressed: false }) : children,
    ),
  ScrollView: ({ children }: { children?: any }) => React.createElement('div', null, children),
  StyleSheet: { create: (s: any) => s },
  Switch: ({ value }: any) =>
    React.createElement('input', { type: 'checkbox', checked: !!value, readOnly: true }),
  Text: ({ children }: { children?: any }) => React.createElement('span', null, children),
  TextInput: ({ value, placeholder }: any) =>
    React.createElement('input', { value: value ?? '', placeholder: placeholder ?? '', readOnly: true }),
  View: ({ children, testID }: any) =>
    React.createElement('div', { 'data-testid': testID }, children),
}));

jest.mock('../../../di/container', () => ({
  authRepository: {
    obtenerVoluntarioActual: jest.fn(async () => null),
    obtenerVoluntariosPendientes: jest.fn(async () => []),
    iniciarSesionComoDemo: jest.fn(async () => ({ nombre: 'Voluntario Demo', fotoUri: null })),
  },
  casoRepository: {},
}));

jest.mock('../../../data/local/CandadoApp', () => ({
  candadoActivado: jest.fn(async () => true),
  celularTieneBloqueo: jest.fn(async () => true),
  guardarCandado: jest.fn(async () => undefined),
}));

jest.mock('../../hooks/useOnline', () => ({
  useOnline: () => true,
}));

jest.mock('../../hooks/useAjustes', () => ({
  useAjustes: () => ({
    borrador: {
      umbralUrgenteDias: 15,
      modoOfflineAutomatico: true,
      recordatorioMinutos: 120,
    },
    cambiar: jest.fn(),
    hayCambios: false,
    guardarCambios: jest.fn(async () => undefined),
    resumen: {
      casosActivos: 4,
      archivados: 1,
      megabytes: 1.5,
      capacidadMegabytes: 50,
    },
    actualizarResumen: jest.fn(async () => undefined),
    cargando: false,
  }),
  sincronizarAhora: { ejecutar: jest.fn(async () => undefined) },
}));

jest.mock('../../stores/useCasoStore', () => {
  const estado = {
    umbralDias: 15,
    casos: [{ id: 'caso-mora', nombreProvisorio: 'Mora' }],
    cargarCasos: jest.fn(async () => undefined),
  };
  return {
    useCasoStore: Object.assign((selector: (s: typeof estado) => any) => selector(estado), {
      getState: () => estado,
    }),
  };
});

import { Caso } from '../../../domain/models/Caso';
import { borradorVacio } from '../../../domain/models/Rescate';
import { AvatarIniciales } from '../../components/AvatarIniciales';
import { CasoCard } from '../../components/CasoCard';
import { SelectorRelacionesAnimal } from '../../components/SelectorRelacionesAnimal';
import { AjustesScreen } from '../ajustes/AjustesScreen';
import { LoginScreen } from '../auth/LoginScreen';
import { CasosVacio } from '../casos/CasosVacio';
import { PasoConfirmar } from '../rescate/PasoConfirmar';

describe('Renderizado de pantallas y componentes UI (.tsx)', () => {
  test('LoginScreen renderiza inicio de sesión real y acceso aislado a modo demo', () => {
    const html = renderToStaticMarkup(
      React.createElement(LoginScreen, {
        onLogin: jest.fn(),
        onRegistro: jest.fn(),
        onRecuperarClave: jest.fn(),
      }),
    );

    expect(html).toContain('Iniciar sesión');
    expect(html).toContain('Ingresar como Voluntario Demo (Modo Offline)');
    expect(html).toContain('Registrate como voluntario');
  });

  test('AjustesScreen renderiza toggles, umbral y botón Guardar cambios', () => {
    const html = renderToStaticMarkup(React.createElement(AjustesScreen, { navigation: {} }));

    expect(html).toContain('Días de espera para marcar como urgente');
    expect(html).toContain('Pedir huella al abrir');
    expect(html).toContain('Guardar cambios');
    expect(html).toContain('4 casos activos');
  });

  test('CasosVacio muestra bandeja vacía para arranque real sin mocks', () => {
    const html = renderToStaticMarkup(React.createElement(CasosVacio, {}));

    expect(html).toContain('Todavía no hay rescates');
    expect(html).toContain('+ Registrar primer rescate');
  });

  test('PasoConfirmar muestra especie Otro con detalle, tests y vínculo familiar', () => {
    const borrador = {
      ...borradorVacio(),
      nombreProvisorio: 'Copito',
      especie: 'Otro' as const,
      especieDetalle: 'Conejo',
      barrio: 'Caballito',
      quienSigueCaso: 'Cami',
      relacionesIniciales: [
        { tipoRelacion: 'HIJO_DE' as const, casoDestinoId: 'caso-mora', nombreDestino: 'Mora' },
      ],
    };

    const html = renderToStaticMarkup(
      React.createElement(PasoConfirmar, {
        borrador,
        sinConexion: false,
        guardando: false,
        onVolver: jest.fn(),
        onGuardar: jest.fn(),
      }),
    );

    expect(html).toContain('Paso 3 de 3');
    expect(html).toContain('Copito');
    expect(html).toContain('Conejo');
    expect(html).toContain('Control: Pendiente');
    expect(html).toContain('Hijo de Mora');
  });

  test('CasoCard renderiza autor del rescate, especie y vínculo principal', () => {
    const ahora = Date.now();
    const caso: Caso = {
      id: 'caso-tito',
      nombreProvisorio: 'Tito',
      cantidadAnimales: 1,
      especie: 'Perro',
      edadEstimada: '3 meses',
      historiaOrigen: 'Encontrado en parque',
      personalidad: 'Juguetón',
      estadoVisible: 'Sano',
      barrio: 'Palermo',
      fechaRescate: ahora - 2 * 24 * 60 * 60 * 1000,
      quienSigueCaso: 'Cami',
      creadoPorNombre: 'Sofía Reyes',
      transito: { nombre: 'Ana', telefono: '1155550000' },
      sanidad: { castrado: 'PENDIENTE', virales: 'PENDIENTE' },
      estadoCaso: 'EN_TRANSITO',
      gravedadClinica: 'MODERADA',
      vulnerabilidad: 'ESTABLE',
      nivelPrioridad: 'ATENCION',
      motivoUrgencia: 'Moderado',
      puntajePrioridad: 500,
      esUrgente: false,
      syncStatus: 'SYNCED',
      updatedAt: ahora,
      relaciones: [
        {
          id: 'rel-1',
          casoOrigenId: 'caso-tito',
          tipoRelacion: 'HIJO_DE',
          casoDestinoId: 'caso-mora',
          nombreDestino: 'Mora',
          updatedAt: ahora,
        },
      ],
    };

    const html = renderToStaticMarkup(React.createElement(CasoCard, { caso }));

    expect(html).toContain('Tito');
    expect(html).toContain('Palermo');
    expect(html).toContain('Rescate registrado por Sofía Reyes');
    expect(html).toContain('Hijo de Mora');
  });

  test('SelectorRelacionesAnimal renderiza vínculos configurables y lista de selección', () => {
    const html = renderToStaticMarkup(
      React.createElement(SelectorRelacionesAnimal, {
        relaciones: [
          { tipoRelacion: 'HERMANA_DE', casoDestinoId: 'caso-mora', nombreDestino: 'Mora' },
        ],
        casosDisponibles: [],
        onAgregar: jest.fn(),
        onQuitar: jest.fn(),
      }),
    );

    expect(html).toContain('Hermana de Mora');
    expect(html).toContain('1. Elegí el tipo de vínculo');
  });

  test('AvatarIniciales renderiza iniciales de respaldo sin foto e img con fotoUri', () => {
    const sinFoto = renderToStaticMarkup(
      React.createElement(AvatarIniciales, { nombre: 'Sofía Reyes', fotoUri: null }),
    );
    expect(sinFoto).toContain('SR');

    const conFoto = renderToStaticMarkup(
      React.createElement(AvatarIniciales, {
        nombre: 'Sofía Reyes',
        fotoUri: 'https://example.com/sofia.jpg',
      }),
    );
    expect(conFoto).toContain('https://example.com/sofia.jpg');
  });
});
