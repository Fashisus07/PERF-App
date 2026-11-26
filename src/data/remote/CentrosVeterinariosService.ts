import { CentroVeterinario } from '../../domain/models/Turno';
import { generarUUID } from '../local/uuid';
import { guardarCentroLocal } from './sincronizacion/AlmacenSqlite';
import { filaCentroParaServidor } from './sincronizacion/mapeo';
import { supabase } from './supabaseClient';

/** Una veterinaria nueva, lista para completar y guardar. */
export function centroNuevo(): CentroVeterinario {
  return {
    id: generarUUID(),
    nombre: '',
    barrio: '',
    direccion: '',
    telefono: '',
    abierto: true,
    tipo: 'consultorio',
    horarios: [],
    diasAtencion: [],
  };
}

/**
 * Alta o cambio de una veterinaria. Lo hace el administrador y necesita conexión: el servidor es
 * quien decide (la política RLS solo deja escribir al administrador) y de ahí la bajan todos los
 * celulares en la próxima sincronización. Si el servidor lo acepta, también queda en este teléfono.
 */
export async function guardarCentro(centro: CentroVeterinario): Promise<CentroVeterinario> {
  const fila = filaCentroParaServidor(centro);
  const { error } = await supabase.from('centros_veterinarios').upsert(fila, { onConflict: 'id' });
  if (error) {
    if (error.code === '42501') throw new Error('Solo el administrador puede cargar veterinarias.');
    if (!error.code && /network|fetch|timeout|connection/i.test(error.message)) {
      throw new Error('Sin conexión: las veterinarias se cargan con internet.');
    }
    throw new Error(error.message);
  }
  const guardado: CentroVeterinario = {
    ...centro,
    horarios: fila.horarios,
    diasAtencion: Array.isArray(fila.dias_atencion) ? fila.dias_atencion : [],
  };
  await guardarCentroLocal(guardado);
  return guardado;
}
