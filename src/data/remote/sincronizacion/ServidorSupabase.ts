import { supabase } from '../supabaseClient';
import { ErrorCasoInexistente, ErrorDeRed, ServidorRemoto } from './MotorSincronizacion';

interface ErrorPostgrest {
  code?: string;
  message: string;
}

const esErrorDeRed = (e: ErrorPostgrest) => !e.code && /network|fetch|timeout|abort|connection/i.test(e.message);

function traducir(e: ErrorPostgrest): Error {
  if (esErrorDeRed(e)) return new ErrorDeRed(e.message);
  if (e.code === 'P0002') return new ErrorCasoInexistente(e.message);
  return new Error(e.message);
}

async function insertar(tabla: string, fila: Record<string, unknown>): Promise<'creado' | 'existia'> {
  const { error } = await supabase.from(tabla).insert(fila);
  if (!error) return 'creado';
  if (error.code === '23505') return 'existia'; // mismo UUID: es un reintento que ya se había aplicado
  throw traducir(error);
}

async function listar(tabla: string): Promise<Record<string, any>[]> {
  const { data, error } = await supabase.from(tabla).select('*');
  if (error) throw traducir(error);
  return data ?? [];
}

/** Implementación del servidor con Supabase. Las reglas de acceso las aplica RLS en el backend. */
export const servidorSupabase: ServidorRemoto = {
  async haySesion() {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  },

  insertarCaso: (fila) => insertar('casos', fila),
  insertarEvento: (fila) => insertar('eventos_historial', fila),
  insertarTurno: (fila) => insertar('turnos', fila),

  async obtenerCaso(id) {
    const { data, error } = await supabase.from('casos').select('*').eq('id', id).maybeSingle();
    if (error) throw traducir(error);
    return data;
  },

  async aplicarCambiosCaso(id, cambios, camposTs, baseIso) {
    const { data, error } = await supabase.rpc('aplicar_cambios_caso', {
      p_id: id,
      p_cambios: cambios,
      p_campos_ts: camposTs,
      p_base: baseIso,
    });
    if (error) throw traducir(error);
    return data as { aplicados: string[]; conflictos: string[] };
  },

  async marcarTurnoCumplido(id) {
    const { error } = await supabase.from('turnos').update({ cumplido: true }).eq('id', id);
    if (error) throw traducir(error);
  },

  async borrarTurno(id) {
    const { error } = await supabase.from('turnos').delete().eq('id', id);
    if (error) throw traducir(error);
  },

  async idsCentros() {
    return new Set((await listar('centros_veterinarios')).map((c) => c.id as string));
  },

  listarCasos: () => listar('casos'),
  listarEventos: () => listar('eventos_historial'),
  listarTurnos: () => listar('turnos'),
};
