import type { AnimalCaso } from '../models/Animal';
import type { Caso, EstadoCastracion, EstadoVirales, FichaSanitariaFelina } from '../models/Caso';

/**
 * Un caso agrupa uno o varios animales y la sanidad es de cada uno. `Caso.sanidad` es el resumen
 * del grupo: al crear el caso cada animal arranca con esa ficha, y mientras la pantalla edite la
 * ficha del grupo, el cambio se aplica a todos sus animales.
 */
export function crearAnimalesDelCaso(caso: Caso, nuevoId: () => string, ahora: number = Date.now()): AnimalCaso[] {
  const cantidad = Math.max(1, caso.cantidadAnimales || 1);
  return Array.from({ length: cantidad }, (_, i) => ({
    id: nuevoId(),
    casoId: caso.id,
    nombre: cantidad === 1 ? caso.nombreProvisorio : `${caso.nombreProvisorio} ${i + 1}`,
    castrado: caso.sanidad.castrado,
    virales: caso.sanidad.virales,
    embarazada: false,
    pesoGramos: null,
    fechaPrimeraDesparasitacion: caso.sanidad.fechaPrimeraDesparasitacion ?? null,
    fechaSegundaDesparasitacion: caso.sanidad.fechaSegundaDesparasitacion ?? null,
    fallecido: false,
    motivoFallecimiento: null,
    syncStatus: 'PENDING' as const,
    updatedAt: ahora,
  }));
}

/** Copia la ficha sanitaria del grupo a un animal, sin tocar sus datos propios (nombre, peso, embarazo). */
export function conSanidadDelGrupo(animal: AnimalCaso, sanidad: FichaSanitariaFelina, ahora: number = Date.now()): AnimalCaso {
  return {
    ...animal,
    castrado: sanidad.castrado,
    virales: sanidad.virales,
    fechaPrimeraDesparasitacion: sanidad.fechaPrimeraDesparasitacion ?? null,
    fechaSegundaDesparasitacion: sanidad.fechaSegundaDesparasitacion ?? null,
    syncStatus: 'PENDING',
    updatedAt: ahora,
  };
}

export function sanidadCambio(a: FichaSanitariaFelina, b: FichaSanitariaFelina): boolean {
  return (
    a.castrado !== b.castrado ||
    a.virales !== b.virales ||
    (a.fechaPrimeraDesparasitacion ?? null) !== (b.fechaPrimeraDesparasitacion ?? null) ||
    (a.fechaSegundaDesparasitacion ?? null) !== (b.fechaSegundaDesparasitacion ?? null)
  );
}

/**
 * Resumen de la sanidad de un grupo, para la ficha del caso y la lista: cuenta lo peor de cada uno.
 * Los animales fallecidos no cuentan (salvo que todos lo estén).
 */
export function resumenSanidad(animales: AnimalCaso[]): FichaSanitariaFelina | null {
  const vivos = animales.filter((a) => !a.fallecido);
  const grupo = vivos.length ? vivos : animales;
  if (!grupo.length) return null;

  let castrado: EstadoCastracion;
  if (grupo.every((a) => a.castrado === 'SI')) castrado = 'SI';
  else if (grupo.some((a) => a.castrado === 'PENDIENTE')) castrado = 'PENDIENTE';
  else castrado = 'NO';

  const hayVif = grupo.some((a) => a.virales === 'VIF_POSITIVO' || a.virales === 'AMBOS_POSITIVOS');
  const hayVilef = grupo.some((a) => a.virales === 'VILEF_POSITIVO' || a.virales === 'AMBOS_POSITIVOS');
  let virales: EstadoVirales;
  if (hayVif && hayVilef) virales = 'AMBOS_POSITIVOS';
  else if (hayVif) virales = 'VIF_POSITIVO';
  else if (hayVilef) virales = 'VILEF_POSITIVO';
  else if (grupo.some((a) => a.virales === 'PENDIENTE')) virales = 'PENDIENTE';
  else virales = 'NEGATIVO';

  // La desparasitacion cuenta como aplicada cuando la tienen todos; se muestra la fecha mas antigua.
  const fechaDeTodos = (campo: 'fechaPrimeraDesparasitacion' | 'fechaSegundaDesparasitacion'): number | null => {
    const fechas = grupo.map((a) => a[campo]);
    return fechas.every((f) => f != null) ? Math.min(...(fechas as number[])) : null;
  };

  return {
    castrado,
    virales,
    fechaPrimeraDesparasitacion: fechaDeTodos('fechaPrimeraDesparasitacion'),
    fechaSegundaDesparasitacion: fechaDeTodos('fechaSegundaDesparasitacion'),
  };
}
