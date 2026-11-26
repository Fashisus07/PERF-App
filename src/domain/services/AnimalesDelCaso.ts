import type { AnimalCaso } from '../models/Animal';
import type { Caso, FichaSanitariaFelina } from '../models/Caso';

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
