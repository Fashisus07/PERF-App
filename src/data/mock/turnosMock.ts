import { Clinica, conHora, SolicitudTurno, sumarDias, Turno } from '../../domain/models/Turno';

export const clinicasMock: Clinica[] = [
  {
    id: 'patitas',
    nombre: 'Clínica Veterinaria Patitas',
    medico: 'Dr. Gabriel Rossi',
    barrio: 'Balvanera',
    direccion: 'Av. Rivadavia 2840',
    telefono: '+541143210000',
    distancia: 'A 12 cuadras de la base',
    abierto: true,
    tipo: 'consultorio',
  },
  {
    id: 'central',
    nombre: 'Hospital Veterinario Central',
    medico: 'Dra. Laura Méndez',
    barrio: 'Almagro',
    direccion: 'San Juan y Boedo',
    telefono: '+541143220000',
    detalle: 'Guardia 24 hs',
    distancia: 'A 25 cuadras de la base',
    abierto: true,
    tipo: 'hospital',
  },
  {
    id: 'zoonosis',
    nombre: 'Centro Quirúrgico Zoonosis Sanitario',
    barrio: 'Parque Chacabuco',
    direccion: 'Av. Eva Perón 1200',
    telefono: '+541143230000',
    abierto: false,
    tipo: 'quirurgico',
  },
];

const hoy = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Turnos de ejemplo, siempre relativos a "hoy" para que la agenda tenga sentido cualquier día.
export function turnosIniciales(): Turno[] {
  const h = hoy();
  return [
    { id: 't1', casoId: '1', clinicaId: 'patitas', fecha: conHora(h, '10:30'), motivo: 'vacunacion', titulo: 'Chequeo general y vacunación', estado: 'confirmado', avisos: ['2horas'] },
    { id: 't2', casoId: '4', clinicaId: 'central', fecha: conHora(h, '16:45'), motivo: 'laboratorio', titulo: 'Ecografía abdominal', estado: 'confirmado', avisos: ['2horas'] },
    {
      id: 't3', casoId: '3', clinicaId: 'zoonosis', fecha: conHora(sumarDias(h, 3), '11:00'), motivo: 'cirugia',
      titulo: 'Cirugía de esterilización programada', estado: 'porConfirmar', avisos: ['1dia'],
      aviso: { titulo: 'Ayuno obligatorio de 8 horas', texto: 'Retirar alimento a las 03:00 hs y agua 2 horas antes de la intervención quirúrgica.' },
    },
    { id: 't4', casoId: '2', clinicaId: 'central', fecha: conHora(sumarDias(h, 4), '15:30'), motivo: 'control', titulo: 'Retiro de puntos y control postoperatorio', estado: 'confirmado', avisos: ['1dia'] },
  ];
}

// Horarios que otras guardias reservaron y que no aparecen en esta agenda (se usan para el aviso de cupo agotado).
export function reservasDeOtrasGuardias(): { clinicaId: string; fecha: Date }[] {
  const h = hoy();
  return [{ clinicaId: 'patitas', fecha: conHora(sumarDias(h, 1), '11:15') }];
}

export type { SolicitudTurno };
