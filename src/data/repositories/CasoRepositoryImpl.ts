import { Caso, CambioEstado, ETIQUETA_ESTADO, rescateDe } from '../../domain/models/Caso';
import { CasoRepository } from '../../domain/repositories/CasoRepository';
import { casosMock } from '../mock/casosMock';

// TODO (Mateo): reemplazar el mock por SQLite (data/local) + API (data/remote).
export class CasoRepositoryImpl implements CasoRepository {
  async obtenerActivos(): Promise<Caso[]> {
    return casosMock;
  }

  async obtenerPorId(id: string): Promise<Caso | undefined> {
    return casosMock.find((c) => c.id === id);
  }

  async agregar(datos: Omit<Caso, 'id' | 'codigo'>): Promise<Caso> {
    const numero = casosMock.length + 1;
    const caso: Caso = {
      ...datos,
      id: String(numero),
      codigo: `REC-${new Date().getFullYear()}-${String(numero).padStart(3, '0')}`,
    };
    casosMock.unshift(caso);
    return caso;
  }

  async actualizarEstado(id: string, cambio: CambioEstado): Promise<Caso> {
    const caso = casosMock.find((c) => c.id === id);
    if (!caso) throw new Error('Caso inexistente');
    const hora = `${String(cambio.fecha.getHours()).padStart(2, '0')}:${String(cambio.fecha.getMinutes()).padStart(2, '0')}`;
    // Se recuerda dónde se rescató antes de actualizar la ubicación actual.
    const rescate = rescateDe(caso);
    caso.lugarRescate = rescate.lugar;
    caso.barrioRescate = rescate.barrio ?? rescate.lugar;
    caso.ubicacion = cambio.destino?.trim() || (cambio.estado === 'calle' ? caso.barrioRescate : caso.ubicacion);
    caso.ubicacionTipo = cambio.estado === 'tratamiento' ? 'veterinaria' : 'calle';
    caso.estadoCaso = cambio.estado;
    caso.estado = ETIQUETA_ESTADO[cambio.estado];
    caso.pendienteSync = cambio.sinConexion;
    // El evento más reciente va primero en el historial.
    caso.historial = [
      { fecha: `Hoy • ${hora} hs`, titulo: `Cambio de estado: ${ETIQUETA_ESTADO[cambio.estado]}`, detalle: cambio.motivo },
      ...(caso.historial ?? []),
    ];
    return caso;
  }
}
