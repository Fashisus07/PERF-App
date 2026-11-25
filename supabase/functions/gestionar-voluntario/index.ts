// Aprueba o rechaza una postulación desde el enlace del correo (quien abre el enlace no tiene
// sesión). Se autoriza con el token de un solo uso que generó notificar-voluntario y que está en
// app_metadata. Desde la app, el administrador usa en cambio las funciones SQL
// aprobar_voluntario / rechazar_voluntario con su propia sesión.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { cors, json } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ success: false, mensaje: 'Método no permitido' }, 405);

  let accion = '';
  let id = '';
  let token = '';
  try {
    const b = await req.json();
    accion = String(b.accion ?? '');
    id = String(b.id ?? '');
    token = String(b.token ?? '');
  } catch {
    return json({ success: false, mensaje: 'Cuerpo inválido' }, 400);
  }
  if (!['aprobar', 'rechazar'].includes(accion) || !/^[0-9a-f-]{36}$/i.test(id) || !token) {
    return json({ success: false, mensaje: 'Parámetros incompletos' }, 400);
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: u } = await admin.auth.admin.getUserById(id);
  const esperado = u?.user?.app_metadata?.token_aprobacion;
  if (!u?.user || !esperado || esperado !== token) {
    return json({ success: false, mensaje: 'El enlace es inválido o ya fue utilizado.' }, 403);
  }

  const { data: perfil } = await admin.from('perfiles').select('nombre, email').eq('id', id).maybeSingle();
  const nombre = perfil?.nombre ?? 'Voluntario';
  const email = perfil?.email ?? u.user.email ?? '';

  if (accion === 'aprobar') {
    const { error } = await admin.from('perfiles').update({ aprobado: true }).eq('id', id);
    if (error) return json({ success: false, mensaje: error.message }, 500);
    await admin.auth.admin.updateUserById(id, {
      app_metadata: { ...u.user.app_metadata, token_aprobacion: null },
    });
    return json({
      success: true,
      mensaje: `El voluntario ${nombre} (${email}) fue aprobado con éxito. Ya puede iniciar sesión.`,
      nombre,
      email,
    });
  }

  const { error } = await admin.auth.admin.deleteUser(id); // borra también su perfil (cascada)
  if (error) return json({ success: false, mensaje: error.message }, 500);
  return json({
    success: true,
    mensaje: `La solicitud de ${nombre} fue rechazada y sus datos fueron eliminados de la base de datos.`,
    nombre,
    email,
  });
});
