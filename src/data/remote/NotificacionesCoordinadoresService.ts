import { supabase } from './supabaseClient';

/**
 * Avisa a los coordinadores que hay una postulación nueva de voluntario.
 *
 * El armado y el envío del correo, y el token del enlace de aprobación, viven en la Edge Function
 * `notificar-voluntario` (supabase/functions). La app no tiene ninguna clave privilegiada: solo le
 * pasa el id del postulante, y la función verifica del lado del servidor que sea una postulación
 * pendiente y reciente.
 */
export async function notificarCoordinadoresNuevoVoluntario(
  idPostulante: string
): Promise<{ enviados: number; total: number }> {
  const { data, error } = await supabase.functions.invoke('notificar-voluntario', {
    body: { id: idPostulante },
  });
  if (error) throw error;
  return { enviados: data?.enviados ?? 0, total: data?.total ?? 0 };
}
