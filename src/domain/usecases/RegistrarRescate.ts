import {
  Caso,
  Especie,
  RegistroTestAnimal,
  RelacionAnimal,
  ResultadoTestViral,
  testsPorEspecie,
} from '../models/Caso';
import { BorradorRescate, faltantesDelRescate } from '../models/Rescate';
import { CasoRepository } from '../repositories/CasoRepository';
import { generarUUID } from '../../data/local/uuid';
import { calcularPrioridadCasoUseCase } from './CalcularPrioridadCasoUseCase';

export type AutorRescate = {
  id?: string | null;
  nombre?: string | null;
};

export class RegistrarRescate {
  constructor(private readonly repo: CasoRepository) {}

  async ejecutar(
    b: BorradorRescate,
    sinConexion: boolean = false,
    autor?: AutorRescate | null
  ): Promise<Caso> {
    const faltan = faltantesDelRescate(b);
    if (faltan.length) {
      throw new Error(`Falta completar: ${faltan.join(', ')}`);
    }

    const ahora = Date.now();
    const especie: Especie = b.especie || 'Gato';
    const casoId = generarUUID();
    const autorId = autor?.id?.trim() || undefined;
    const autorNombre = autor?.nombre?.trim() || null;

    const testsFijos = testsPorEspecie(especie);
    const testsAnimal: RegistroTestAnimal[] = testsFijos.map((t) => {
      let resultado: ResultadoTestViral = b.resultadosTests?.[t.id] ?? 'PENDIENTE';
      if (especie === 'Gato' && !b.resultadosTests?.[t.id]) {
        if (b.virales === 'NEGATIVO') resultado = 'NEGATIVO';
        else if (b.virales === 'AMBOS_POSITIVOS') resultado = 'POSITIVO';
        else if (t.id === 'vif' && b.virales === 'VIF_POSITIVO') resultado = 'POSITIVO';
        else if (t.id === 'vif' && b.virales === 'VILEF_POSITIVO') resultado = 'NEGATIVO';
        else if (t.id === 'vilef' && b.virales === 'VILEF_POSITIVO') resultado = 'POSITIVO';
        else if (t.id === 'vilef' && b.virales === 'VIF_POSITIVO') resultado = 'NEGATIVO';
      }
      return {
        id: generarUUID(),
        casoId,
        animalId: null,
        testId: t.id,
        resultado,
        fechaTest: resultado === 'PENDIENTE' ? null : ahora,
        registradoPor: autorId ?? null,
        updatedAt: ahora,
      };
    });

    const sanidad = {
      castrado: b.castrado || 'PENDIENTE',
      virales: b.virales || 'PENDIENTE',
      fechaPrimeraDesparasitacion: b.fechaPrimeraDesparasitacion ?? null,
      fechaSegundaDesparasitacion: b.fechaSegundaDesparasitacion ?? null,
    };
    const prioridad = calcularPrioridadCasoUseCase.ejecutar(
      {
        especie,
        estadoCaso: 'EN_TRANSITO',
        gravedadClinica: b.gravedadClinica,
        vulnerabilidad: b.vulnerabilidad,
        fechaRescate: ahora,
        sanidad,
        testsAnimal,
      },
      15,
      ahora
    );

    const relaciones: RelacionAnimal[] = (b.relacionesIniciales ?? [])
      .filter((r) => r.nombreDestino.trim().length > 0)
      .map((r) => ({
        id: generarUUID(),
        casoOrigenId: casoId,
        tipoRelacion: r.tipoRelacion,
        casoDestinoId: r.casoDestinoId ?? null,
        nombreDestino: r.nombreDestino.trim(),
        updatedAt: ahora,
      }));

    const caso: Caso = {
      id: casoId,
      nombreProvisorio: b.nombreProvisorio.trim(),
      cantidadAnimales: 1,
      especie,
      especieDetalle: especie === 'Otro' ? (b.especieDetalle?.trim() || null) : null,
      edadEstimada: b.edadEstimada.trim() || 'Desconocida',
      historiaOrigen: b.historiaOrigen.trim(),
      personalidad: b.personalidad.trim(),
      estadoVisible: b.estadoVisible.trim(),
      barrio: b.barrio.trim(),
      coordenadas: b.coordenadas ?? null,
      fotoUri: b.fotoUri ?? null,
      fotoLocalUri: b.fotoUri ?? null,
      fotoRemotePath: null,
      fotoSyncStatus: b.fotoUri ? 'PENDING' : 'SYNCED',
      fechaRescate: ahora,
      quienSigueCaso: b.quienSigueCaso || 'PERF',
      coordinadorId: b.coordinadorId ?? null,
      transito: {
        nombre: b.transitoNombre.trim(),
        telefono: b.transitoTelefono.trim(),
        correo: b.transitoCorreo?.trim() || undefined,
      },
      sanidad,
      testsAnimal,
      relaciones,
      estadoCaso: 'EN_TRANSITO',
      gravedadClinica: b.gravedadClinica,
      vulnerabilidad: b.vulnerabilidad,
      nivelPrioridad: prioridad.nivelPrioridad,
      motivoUrgencia: prioridad.motivoUrgencia,
      puntajePrioridad: prioridad.puntajePrioridad,
      creadoPorUserId: autorId,
      creadoPorNombre: autorNombre,
      esUrgente: prioridad.esUrgente,
      syncStatus: sinConexion ? 'PENDING' : 'SYNCED',
      updatedAt: ahora,
    };

    const guardado = await this.repo.agregar(caso);
    for (const reg of testsAnimal) {
      await this.repo.guardarResultadoTest?.(reg);
    }
    for (const rel of relaciones) {
      await this.repo.guardarRelacion?.(rel);
    }
    return guardado;
  }
}
