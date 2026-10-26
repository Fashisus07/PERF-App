import { Caso } from '../models/Caso';
import { BorradorRescate, faltantesDelRescate } from '../models/Rescate';
import { CasoRepository } from '../repositories/CasoRepository';
import { generarUUID } from '../../data/local/uuid';

export class RegistrarRescate {
  constructor(private readonly repo: CasoRepository) {}

  async ejecutar(b: BorradorRescate, sinConexion: boolean = false): Promise<Caso> {
    const faltan = faltantesDelRescate(b);
    if (faltan.length) {
      throw new Error(`Falta completar: ${faltan.join(', ')}`);
    }

    const ahora = Date.now();
    const caso: Caso = {
      id: generarUUID(),
      nombreProvisorio: b.nombreProvisorio.trim(),
      cantidadAnimales: Math.max(1, b.cantidadAnimales || 1),
      especie: b.especie || 'Gato',
      edadEstimada: b.edadEstimada.trim() || 'Desconocida',
      historiaOrigen: b.historiaOrigen.trim(),
      personalidad: b.personalidad.trim(),
      estadoVisible: b.estadoVisible.trim(),
      barrio: b.barrio.trim(),
      coordenadas: b.coordenadas ?? null,
      fotoUri: b.fotoUri ?? null,
      fechaRescate: ahora,
      quienSigueCaso: b.quienSigueCaso || 'PERF',
      transito: {
        nombre: b.transitoNombre.trim(),
        telefono: b.transitoTelefono.trim(),
        correo: b.transitoCorreo?.trim() || undefined,
      },
      sanidad: {
        castrado: b.castrado || 'PENDIENTE',
        virales: b.virales || 'PENDIENTE',
        fechaPrimeraDesparasitacion: b.fechaPrimeraDesparasitacion ?? null,
        fechaSegundaDesparasitacion: b.fechaSegundaDesparasitacion ?? null,
      },
      estadoCaso: 'EN_TRANSITO',
      esUrgente: b.esUrgente,
      syncStatus: sinConexion ? 'PENDING' : 'SYNCED',
      updatedAt: ahora,
    };

    return this.repo.agregar(caso);
  }
}
