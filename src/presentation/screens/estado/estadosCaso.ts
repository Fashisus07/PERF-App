import { MaterialIcons } from '@expo/vector-icons';
import { EstadoCaso } from '../../../domain/models/Caso';

type Icono = keyof typeof MaterialIcons.glyphMap;

export type EstadoInfo = {
  key: EstadoCaso;
  titulo: string; // título largo (pantalla Cambiar Estado)
  descripcion: string;
  icono: Icono; // ícono de la lista de selección
  iconoChip: Icono; // ícono del chip en la ficha
  aviso?: { texto: string; bg: string; fg: string };
  proximoPaso: string;
};

export const ESTADOS_CASO: EstadoInfo[] = [
  {
    key: 'calle',
    titulo: 'En la Calle / Rescate en Curso',
    descripcion: 'Seguimiento barrial o animal no retenido en campo.',
    icono: 'explore',
    iconoChip: 'pets',
    proximoPaso: 'Retomá el monitoreo del barrio: confirmá si el animal sigue en la zona y registrá cómo se lo ve.',
  },
  {
    key: 'transito',
    titulo: 'En Hogar de Tránsito',
    descripcion: 'Hospedado temporalmente con voluntario responsable.',
    icono: 'home',
    iconoChip: 'home',
    proximoPaso: 'Coordiná con el hogar de tránsito el ingreso: alimento, canil y primera revisión.',
  },
  {
    key: 'tratamiento',
    titulo: 'En Clínica / Internación',
    descripcion: 'Atención médica prioritaria, cirugía o cuidados críticos.',
    icono: 'local-hospital',
    iconoChip: 'medical-services',
    aviso: { texto: 'Requiere centro veterinario', bg: '#ffdad6', fg: '#93000a' },
    proximoPaso: 'Confirmá el turno en la clínica y llevá la ficha sanitaria actualizada.',
  },
  {
    key: 'preadopcion',
    titulo: 'En Pre-adopción',
    descripcion: 'Convivencia de adaptación con familia evaluada.',
    icono: 'groups',
    iconoChip: 'groups',
    proximoPaso: 'Acordá con la familia evaluada las visitas de adaptación y el seguimiento.',
  },
  {
    key: 'adoptado',
    titulo: 'Adoptado (Listo para Archivar)',
    descripcion: 'Final feliz. El caso pasa al archivo histórico.',
    icono: 'volunteer-activism',
    iconoChip: 'volunteer-activism',
    aviso: { texto: 'Cierre definitivo', bg: '#7ffc97', fg: '#002109' },
    proximoPaso: 'Registrá los datos de la adopción y archivá el caso.',
  },
  {
    key: 'fallecido',
    titulo: 'Fallecido / Deceso',
    descripcion: 'Cierre sensible con protocolo de constatación clínica.',
    icono: 'bedtime',
    iconoChip: 'sentiment-very-dissatisfied',
    proximoPaso: 'Completá la constatación clínica y avisá al coordinador de zona.',
  },
];

export const infoEstado = (key: EstadoCaso) => ESTADOS_CASO.find((e) => e.key === key)!;
