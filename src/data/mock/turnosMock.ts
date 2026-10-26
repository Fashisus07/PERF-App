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
    {
      id: 't-1',
      casoId: 'caso-1-misho',
      centroVeterinarioId: 'patitas',
      fechaHora: conHora(h, '10:30').getTime(),
      motivo: 'Control respiratorio y evaluación de vacuna triple',
      recordatorioMinutos: 120,
      cumplido: false,
      syncStatus: 'SYNCED',
      updatedAt: Date.now(),
    },
    {
      id: 't-2',
      casoId: 'caso-4-luna',
      centroVeterinarioId: 'central',
      fechaHora: conHora(h, '16:45').getTime(),
      motivo: 'Ecografía de control post-castración',
      recordatorioMinutos: 120,
      cumplido: false,
      syncStatus: 'SYNCED',
      updatedAt: Date.now(),
    },
    {
      id: 't-3',
      casoId: 'caso-3-tigre',
      centroVeterinarioId: 'zoonosis',
      fechaHora: conHora(sumarDias(h, 3), '11:00').getTime(),
      motivo: 'Castración y control ocular quirúrgico',
      recordatorioMinutos: 1440,
      cumplido: false,
      syncStatus: 'SYNCED',
      updatedAt: Date.now(),
    },
    {
      id: 't-4',
      casoId: 'caso-2-canela',
      centroVeterinarioId: 'central',
      fechaHora: conHora(sumarDias(h, 4), '15:30').getTime(),
      motivo: 'Control prenatal y ecografía fetal',
      recordatorioMinutos: 1440,
      cumplido: false,
      syncStatus: 'SYNCED',
      updatedAt: Date.now(),
    },
  ];
}

// Horarios que otras guardias reservaron y que no aparecen en esta agenda (se usan para el aviso de cupo agotado).
export function reservasDeOtrasGuardias(): { clinicaId: string; fecha: Date }[] {
  const h = hoy();
  return [{ clinicaId: 'patitas', fecha: conHora(sumarDias(h, 1), '11:15') }];
}

export type { SolicitudTurno };
