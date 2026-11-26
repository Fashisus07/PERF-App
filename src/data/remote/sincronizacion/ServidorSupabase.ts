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

/**
 * Inserción con idempotencia (UPSERT): si el UUID ya existe en el servidor, no duplica.
 */
async function insertar(tabla: string, fila: Record<string, unknown>): Promise<'creado' | 'existia'> {
  const { error } = await supabase.from(tabla).upsert(fila, { onConflict: 'id', ignoreDuplicates: true });
  if (!error) return 'creado';
  if (error.code === '23505') return 'existia'; // mismo UUID: reintento ya aplicado
  throw traducir(error);
}

async function listar(tabla: string, campoFecha?: string, desdeIso?: string): Promise<Record<string, any>[]> {
  let query = supabase.from(tabla).select('*');
  if (desdeIso && campoFecha) {
    query = query.gt(campoFecha, desdeIso);
  }
  const { data, error } = await query;
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
  insertarAnimal: (fila) => insertar('animales', fila),

  async guardarAnimal(fila) {
    const { id, caso_id: _caso, ...cambios } = fila;
    const { data, error } = await supabase.from('animales').update(cambios).eq('id', id).select('id');
    if (error) throw traducir(error);
    if (!data?.length) await insertar('animales', fila); // el animal solo existia en este telefono
  },

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
    const { error } = await supabase.from('turnos').update({ cumplido: true, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw traducir(error);
  },

  async borrarTurno(id) {
    const { error } = await supabase.from('turnos').delete().eq('id', id);
    if (error) throw traducir(error);
  },

  async guardarResultadoTest(fila) {
    const { error } = await supabase.from('resultados_tests_animal').upsert(fila, { onConflict: 'id' });
    if (!error) return;
    if (error.code === '23505') {
      // Mismo (caso_id, test_id) creado desde otro dispositivo con distinto UUID: actualizar por clave lógica
      const { id: _id, caso_id, test_id, ...campos } = fila;
      const { error: errUpd } = await supabase
        .from('resultados_tests_animal')
        .update(campos)
        .eq('caso_id', caso_id)
        .eq('test_id', test_id);
      if (errUpd) throw traducir(errUpd);
      return;
    }
    throw traducir(error);
  },

  async idsCentros() {
    return new Set((await listar('centros_veterinarios')).map((c) => c.id as string));
  },

  listarCentros: () => listar('centros_veterinarios'),
  listarCoordinadores: () => listar('coordinadores'),
  listarTestsVirales: () => listar('tests_virales'),
  listarResultadosTests: (desdeIso) => listar('resultados_tests_animal', 'updated_at', desdeIso),
  listarRelaciones: (desdeIso) => listar('relaciones_animales', 'updated_at', desdeIso),
  guardarRelacion: async (fila) => {
    await insertar('relaciones_animales', fila);
  },
  borrarRelacion: async (id) => {
    const { error } = await supabase.from('relaciones_animales').delete().eq('id', id);
    if (error) throw traducir(error);
  },
  listarCasos: (desdeIso) => listar('casos', 'updated_at', desdeIso),
  listarEventos: (desdeIso) => listar('eventos_historial', 'created_at', desdeIso),
  listarTurnos: (desdeIso) => listar('turnos', 'updated_at', desdeIso),
  listarAnimales: (desdeIso) => listar('animales', 'updated_at', desdeIso),
};
