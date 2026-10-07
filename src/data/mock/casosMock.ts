import { Caso } from '../../domain/models/Caso';

const calle = 'calle' as const;
const vet = 'veterinaria' as const;

export const casosMock: Caso[] = [
  { id: '1', nombre: 'Misho', descripcion: 'Gato común', urgencia: 'urgente', diasEnEspera: 21, estado: 'En tratamiento ambulatorio', ubicacion: 'Balvanera', ubicacionTipo: calle, foto: require('../../../assets/images/casos/misho.jpg'), pendienteSync: false },
  { id: '2', nombre: 'Canela', descripcion: 'Gata mestiza', urgencia: 'urgente', diasEnEspera: 12, estado: 'En la calle (Monitoreo)', ubicacion: 'Caballito', ubicacionTipo: calle, foto: require('../../../assets/images/casos/canela.jpg'), pendienteSync: false },
  { id: '3', nombre: 'Tigre', descripcion: 'Gato adulto', urgencia: 'urgente', diasEnEspera: 9, estado: 'Derivado a tránsito', ubicacion: 'Palermo', ubicacionTipo: calle, foto: require('../../../assets/images/casos/tigre.jpg'), pendienteSync: false },
  { id: '4', nombre: 'Luna', descripcion: 'Gata joven', urgencia: 'atencion', diasEnEspera: 5, estado: 'En tránsito provisorio', ubicacion: 'Almagro', ubicacionTipo: calle, foto: require('../../../assets/images/casos/luna.jpg'), pendienteSync: false },
  { id: '5', nombre: 'Mora', descripcion: 'Perra pequeña', urgencia: 'aldia', diasEnEspera: 3, estado: 'En veterinaria', ubicacion: 'Clínica Central', ubicacionTipo: vet, foto: require('../../../assets/images/casos/mora.jpg'), pendienteSync: false },
  { id: '6', nombre: 'Pelusa', descripcion: 'Gata persa mestiza', urgencia: 'aldia', diasEnEspera: 2, estado: 'Vacunada / En tránsito', ubicacion: 'Villa Crespo', ubicacionTipo: calle, foto: require('../../../assets/images/casos/pelusa.jpg'), pendienteSync: false },
  { id: '7', nombre: 'Oreo', descripcion: 'Gato tuxedo cachorro', urgencia: 'aldia', diasEnEspera: 1, estado: 'Desparasitado / Listo para adopción', ubicacion: 'Belgrano', ubicacionTipo: calle, foto: require('../../../assets/images/casos/oreo.jpg'), pendienteSync: false },
];
