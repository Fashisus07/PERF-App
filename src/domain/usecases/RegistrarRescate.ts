import { Caso } from '../models/Caso';
import { BorradorRescate, ETIQUETA_EDAD, ETIQUETA_ESPECIE, formatoFecha, urgenciaDeTriaje } from '../models/Rescate';
import { CasoRepository } from '../repositories/CasoRepository';

// Qué falta completar para poder pasar al paso siguiente / guardar.
export function faltantesDelRescate(b: BorradorRescate): string[] {
  const faltan: string[] = [];
  if (!b.especie) faltan.push('la especie');
  if (!b.edad) faltan.push('la edad estimada');
  if (!b.barrio.trim() && !b.lugar.trim()) faltan.push('el lugar del rescate');
  return faltan;
}

export class RegistrarRescate {
  constructor(private readonly repo: CasoRepository) {}

  async ejecutar(b: BorradorRescate, sinConexion: boolean, fotoPorDefecto: Caso['foto']): Promise<Caso> {
    const faltan = faltantesDelRescate(b);
    if (faltan.length) throw new Error(`Falta completar ${faltan.join(', ')}`);

    const caso: Omit<Caso, 'id' | 'codigo'> = {
      nombre: b.nombre.trim() || 'Sin nombre',
      descripcion: `${ETIQUETA_ESPECIE[b.especie!]} · ${ETIQUETA_EDAD[b.edad!]}`,
      urgencia: urgenciaDeTriaje(b.triaje),
      diasEnEspera: 0,
      estado: 'En la calle',
      estadoCaso: 'calle',
      ubicacion: b.barrio.trim() || b.lugar.trim(),
      ubicacionTipo: 'calle',
      direccion: b.lugar.trim() || undefined,
      nota: b.notas.trim() || undefined,
      foto: b.fotoUri ? { uri: b.fotoUri } : fotoPorDefecto,
      pendienteSync: sinConexion,
      fechaIngreso: formatoFecha(new Date(b.fecha)),
    };
    return this.repo.agregar(caso);
  }
}
