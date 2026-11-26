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

export const IDS_TURNOS_MOCK_ANTERIORES = ['t-1', 't-2', 't-3', 't-4'];

// Turnos de ejemplo, siempre relativos a "hoy" para que la agenda tenga sentido cualquier día.
export function turnosIniciales(): Turno[] {
  const h = hoy();
  return [
    {
      id: '20000000-0000-4000-8000-000000000001',
      casoId: '10000000-0000-4000-8000-000000000001',
      centroVeterinarioId: 'central',
      fechaHora: conHora(h, '10:30').getTime(),
      motivo: 'Placa de tórax y control respiratorio',
      recordatorioMinutos: 120,
      cumplido: false,
      syncStatus: 'SYNCED',
      updatedAt: Date.now(),
    },
    {
      id: '20000000-0000-4000-8000-000000000002',
      casoId: '10000000-0000-4000-8000-000000000008',
      centroVeterinarioId: 'patitas',
      fechaHora: conHora(h, '16:45').getTime(),
      motivo: 'Último control antibiótico post absceso',
      recordatorioMinutos: 120,
      cumplido: false,
      syncStatus: 'SYNCED',
      updatedAt: Date.now(),
    },
    {
      id: '20000000-0000-4000-8000-000000000003',
      casoId: '10000000-0000-4000-8000-000000000013',
      centroVeterinarioId: 'zoonosis',
      fechaHora: conHora(sumarDias(h, 2), '11:00').getTime(),
      motivo: 'Cirugía de castración programada',
      recordatorioMinutos: 1440,
      cumplido: false,
      syncStatus: 'SYNCED',
      updatedAt: Date.now(),
    },
    {
      id: '20000000-0000-4000-8000-000000000004',
      casoId: '10000000-0000-4000-8000-000000000004',
      centroVeterinarioId: 'patitas',
      fechaHora: conHora(sumarDias(h, 3), '15:30').getTime(),
      motivo: 'Hemograma y control de inmunodeficiencia',
      recordatorioMinutos: 1440,
      cumplido: false,
      syncStatus: 'SYNCED',
      updatedAt: Date.now(),
    },
    {
      id: '20000000-0000-4000-8000-000000000005',
      casoId: '10000000-0000-4000-8000-000000000002',
      centroVeterinarioId: 'central',
      fechaHora: conHora(sumarDias(h, 4), '09:45').getTime(),
      motivo: 'Control pediátrico de peso y desparasitación',
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
