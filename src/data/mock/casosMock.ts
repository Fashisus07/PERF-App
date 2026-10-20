import { Caso } from '../../domain/models/Caso';

const calle = 'calle' as const;
const vet = 'veterinaria' as const;

export const casosMock: Caso[] = [
  { id: '1', nombre: 'Misho', descripcion: 'Gato común', urgencia: 'urgente', diasEnEspera: 21, estado: 'En tratamiento ambulatorio', ubicacion: 'Balvanera', ubicacionTipo: calle, foto: require('../../../assets/images/casos/misho.jpg'), pendienteSync: false, direccion: 'Plaza Miserere', nota: 'Cuadro respiratorio en resolución. Se le administró antibiótico y desparasitario el 20/02. Pendiente test de VIF/ViLeF y refuerzo de vacuna triple felina.', accionRapida: 'llamar-vet',
    sexo: 'macho', edadAprox: '~2 años', condicion: 'Castrado reciente', fechaIngreso: '12 Feb 2025', estadoCaso: 'calle', resenaEnCurso: true,
    veterinario: { nombre: 'Dr. Gabriel Rossi', clinica: 'Clínica Veterinaria Patitas', telefono: '+541143210000' },
    historial: [
      { fecha: '28 Feb • 10:30 hs', titulo: 'Control clínico y vacunación', detalle: 'En Vet Patitas (Dr. Rossi)', confirmado: true },
      { fecha: '20 Feb • 16:00 hs', titulo: 'Primera atención de urgencia', detalle: 'Medicación inicial y desparasitación suministrada.' },
      { fecha: '12 Feb • 19:30 hs', titulo: 'Reporte de rescate y traslado', detalle: 'Traslado inicial realizado por voluntaria Lucía.' },
    ] },
  { id: '2', nombre: 'Canela', descripcion: 'Gata mestiza', urgencia: 'urgente', diasEnEspera: 12, estado: 'En la calle (Monitoreo)', ubicacion: 'Caballito', ubicacionTipo: calle, foto: require('../../../assets/images/casos/canela.jpg'), pendienteSync: false, direccion: 'Parque Rivadavia', nota: 'Gata preñada en término rescatada en colonia. Contracciones iniciales, requiere tránsito con aislamiento inmediato.', accionRapida: 'coordinar', sexo: 'hembra', edadAprox: '~3 años' },
  { id: '3', nombre: 'Tigre', descripcion: 'Gato adulto', urgencia: 'urgente', diasEnEspera: 9, estado: 'Derivado a tránsito', ubicacion: 'Palermo', ubicacionTipo: calle, foto: require('../../../assets/images/casos/tigre.jpg'), pendienteSync: false, direccion: 'Plaza Italia', nota: 'Infección ocular bilateral severa. Precisa medicación tópica cada 4 horas y evaluación de úlcera corneal.', accionRapida: 'dosis', sexo: 'macho', edadAprox: '~8 meses' },
  { id: '4', nombre: 'Luna', descripcion: 'Gata joven', urgencia: 'atencion', diasEnEspera: 5, estado: 'En tránsito provisorio', ubicacion: 'Almagro', ubicacionTipo: calle, foto: require('../../../assets/images/casos/luna.jpg'), pendienteSync: false, direccion: 'Gurruchaga', nota: 'Control post-castración y desparasitación. Alimentación especial gastrointestinal. Estable en casa de tránsito.', accionRapida: 'transito', sexo: 'hembra', edadAprox: '~4 años' },
  { id: '5', nombre: 'Mora', descripcion: 'Perra pequeña', urgencia: 'aldia', diasEnEspera: 3, estado: 'En veterinaria', ubicacion: 'Clínica Central', ubicacionTipo: vet, foto: require('../../../assets/images/casos/mora.jpg'), pendienteSync: false, direccion: 'San Juan y Boedo', nota: 'Recuperación de cuadro respiratorio viral. Último refuerzo de antibiótico programado para esta tarde.', accionRapida: 'tratamiento' },
  { id: '6', nombre: 'Pelusa', descripcion: 'Gata persa mestiza', urgencia: 'aldia', diasEnEspera: 2, estado: 'Vacunada / En tránsito', ubicacion: 'Villa Crespo', ubicacionTipo: calle, foto: require('../../../assets/images/casos/pelusa.jpg'), pendienteSync: false },
  { id: '7', nombre: 'Oreo', descripcion: 'Gato tuxedo cachorro', urgencia: 'aldia', diasEnEspera: 1, estado: 'Desparasitado / Listo para adopción', ubicacion: 'Belgrano', ubicacionTipo: calle, foto: require('../../../assets/images/casos/oreo.jpg'), pendienteSync: false },
];
