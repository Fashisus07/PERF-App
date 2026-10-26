import { MaterialIcons } from '@expo/vector-icons';
import { EstadoCaso } from '../../../domain/models/Caso';

type Icono = keyof typeof MaterialIcons.glyphMap;

export type EstadoInfo = {
  key: EstadoCaso;
  titulo: string;
  descripcion: string;
  icono: Icono;
  iconoChip: Icono;
  aviso?: { texto: string; bg: string; fg: string };
  proximoPaso: string;
};

export const ESTADOS_CASO: EstadoInfo[] = [
  {
    key: 'EN_TRANSITO',
    titulo: 'En Hogar de Tránsito',
    descripcion: 'Hospedado temporalmente con voluntario o familia responsable.',
    icono: 'home',
    iconoChip: 'home',
    proximoPaso: 'Coordiná con el hogar de tránsito el ingreso: alimento, canil y cuidados diarios.',
  },
  {
    key: 'EN_CLINICA',
    titulo: 'En Clínica / Tratamiento',
    descripcion: 'Atención médica prioritaria, internación, cirugía o cuidados críticos.',
    icono: 'local-hospital',
    iconoChip: 'medical-services',
    aviso: { texto: 'Requiere clínica o veterinaria', bg: '#ffdad6', fg: '#93000a' },
    proximoPaso: 'Confirmá el turno en la clínica y llevá la ficha sanitaria actualizada.',
  },
  {
    key: 'EN_ADOPCION',
    titulo: 'En Adopción Activa',
    descripcion: 'Listo sanitariamente para ser difundido en redes y buscar familia.',
    icono: 'pets',
    iconoChip: 'pets',
    proximoPaso: 'Publicá las fotos y ficha en los canales de difusión de PERF.',
  },
  {
    key: 'PRE_ADOPTADO',
    titulo: 'En Pre-adopción',
    descripcion: 'Convivencia de adaptación con postulante o familia evaluada.',
    icono: 'groups',
    iconoChip: 'groups',
    proximoPaso: 'Realizá seguimiento del período de adaptación de 15 días.',
  },
  {
    key: 'ADOPTADO',
    titulo: 'Adoptado Definitivo',
    descripcion: 'Adopción concretada con contrato firmado. Caso cerrado.',
    icono: 'volunteer-activism',
    iconoChip: 'volunteer-activism',
    aviso: { texto: 'Cierre feliz', bg: '#7ffc97', fg: '#002109' },
    proximoPaso: 'Archivá el caso y enviá felicitaciones a la familia adoptante.',
  },
  {
    key: 'FALLECIDO',
    titulo: 'Fallecido / Deceso',
    descripcion: 'Cierre sensible con protocolo de constatación clínica.',
    icono: 'bedtime',
    iconoChip: 'sentiment-very-dissatisfied',
    proximoPaso: 'Registrá la causa clínica y avisá al coordinador del caso.',
  },
];

export const infoEstado = (key: EstadoCaso) =>
  ESTADOS_CASO.find((e) => e.key === key) || ESTADOS_CASO[0];
