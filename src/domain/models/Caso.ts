// Foto local (require) o archivo sacado con la cámara/galería.
export type Foto = number | { uri: string };

export type Urgencia = 'urgente' | 'atencion' | 'aldia';

export type AccionRapida = 'llamar-vet' | 'coordinar' | 'dosis' | 'transito' | 'tratamiento';

export type EstadoCaso = 'calle' | 'transito' | 'tratamiento' | 'preadopcion' | 'adoptado' | 'fallecido';

export const ETIQUETA_ESTADO: Record<EstadoCaso, string> = {
  calle: 'En la calle',
  transito: 'Derivado a tránsito',
  tratamiento: 'En tratamiento',
  preadopcion: 'En pre-adopción',
  adoptado: 'Adoptado',
  fallecido: 'Fallecido',
};

// Datos que se cargan al cambiar el estado de un caso.
export type CambioEstado = {
  estado: EstadoCaso;
  motivo: string;
  destino?: string; // clínica u hogar de tránsito
  notificarCoordinador: boolean;
  sinConexion: boolean; // si no hay señal, el cambio queda pendiente de sincronizar
  fecha: Date;
};

export type EventoHistorial = {
  fecha: string; // ej: "28 Feb • 10:30 hs"
  titulo: string;
  detalle: string;
  confirmado?: boolean; // turno confirmado, se muestra como tarjeta con badge
};

export type Veterinario = { nombre: string; clinica: string; telefono: string };

export type Caso = {
  id: string;
  nombre: string;
  descripcion: string; // especie / edad aproximada
  urgencia: Urgencia;
  diasEnEspera: number;
  estado: string;
  ubicacion: string;
  ubicacionTipo: 'calle' | 'veterinaria';
  foto: Foto;
  pendienteSync: boolean;
  direccion?: string; // calle o referencia, se muestra en modo offline
  nota?: string; // resumen clínico / de manejo
  accionRapida?: AccionRapida;
  codigo?: string; // ej: REC-2026-008 (casos registrados desde la app)
  // Dónde se rescató. Se guarda la primera vez que el caso cambia de lugar, porque `ubicacion` pasa a ser el lugar actual.
  lugarRescate?: string;
  barrioRescate?: string;
  // Datos de la ficha (pantalla Detalle del caso)
  sexo?: 'macho' | 'hembra';
  edadAprox?: string;
  condicion?: string; // ej: "Castrado reciente"
  fechaIngreso?: string;
  estadoCaso?: EstadoCaso;
  resenaEnCurso?: boolean;
  veterinario?: Veterinario;
  historial?: EventoHistorial[];
};

// Lugar donde se encontró al animal (no cambia aunque se lo derive a otro sitio).
export function rescateDe(caso: Caso): { lugar: string; barrio?: string } {
  return {
    lugar: caso.lugarRescate ?? caso.direccion ?? caso.ubicacion,
    barrio: caso.barrioRescate ?? (caso.direccion ? caso.ubicacion : undefined),
  };
}

// true si el animal ya no está donde fue rescatado (tránsito, clínica, etc.).
export const cambioDeLugar = (caso: Caso) => !!caso.barrioRescate && caso.ubicacion !== caso.barrioRescate;

// "Macho • 2a" / "Hembra • 8m" a partir del sexo y la edad aproximada ("~2 años", "~8 meses").
export function sexoYEdadCorto(caso: Caso): string {
  const sexo = caso.sexo === 'macho' ? 'Macho' : caso.sexo === 'hembra' ? 'Hembra' : '';
  const m = caso.edadAprox?.match(/(\d+)\s*(año|mes)/);
  const edad = m ? `${m[1]}${m[2] === 'año' ? 'a' : 'm'}` : '';
  return [sexo, edad].filter(Boolean).join(' • ');
}

// Un caso con más días de espera que el umbral de los ajustes se considera urgente.
// Solo sube la urgencia: un caso marcado como urgente nunca baja por tener pocos días.
export function conUmbral(caso: Caso, umbralUrgenteDias: number): Caso {
  return caso.diasEnEspera > umbralUrgenteDias && caso.urgencia !== 'urgente' ? { ...caso, urgencia: 'urgente' } : caso;
}
