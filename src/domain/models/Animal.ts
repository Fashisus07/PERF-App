import type { EstadoCastracion, EstadoVirales } from './Caso';

/**
 * Un caso puede agrupar varios animales (camada, mamá con bebés) y la sanidad
 * es de cada uno. `Caso.sanidad` sigue siendo el resumen del grupo.
 */
export interface AnimalCaso {
  id: string; // UUID generado localmente
  casoId: string;
  nombre: string;
  castrado: EstadoCastracion;
  virales: EstadoVirales;
  embarazada: boolean;
  pesoGramos?: number | null;
  fechaPrimeraDesparasitacion?: number | null;
  fechaSegundaDesparasitacion?: number | null;
  fallecido: boolean;
  motivoFallecimiento?: string | null;
}

export type TipoPendiente = 'CASTRACION' | 'ESTUDIO' | 'CIRUGIA' | 'ESPECIALISTA' | 'OTRO';

export const ETIQUETA_PENDIENTE: Record<TipoPendiente, string> = {
  CASTRACION: 'Castración',
  ESTUDIO: 'Estudio',
  CIRUGIA: 'Cirugía',
  ESPECIALISTA: 'Especialista',
  OTRO: 'Otro',
};

/** Algo que falta hacer en un caso (o en uno de sus animales). */
export interface Pendiente {
  id: string; // UUID generado localmente
  casoId: string;
  animalId?: string | null;
  tipo: TipoPendiente;
  descripcion: string;
  resuelto: boolean;
  resueltoEn?: number | null;
}

/** Una adopción. Si el animal vuelve al refugio se completa la devolución y se abre otra. */
export interface Adopcion {
  id: string; // UUID generado localmente
  casoId: string;
  adoptanteNombre: string;
  adoptanteTelefono?: string | null;
  adoptanteCorreo?: string | null;
  fechaAdopcion: number;
  fechaDevolucion?: number | null;
  motivoDevolucion?: string | null;
}
