// Avisa por correo a los coordinadores que hay una postulación nueva.
//
// Se llama desde la app justo después del registro, cuando todavía no hay sesión, por eso no exige
// JWT (verify_jwt = false). La clave service_role vive solo acá (la inyecta Supabase) y nunca
// viaja en la app. Para que nadie pueda usarla para mandar spam:
//   * solo avisa de perfiles NO aprobados, creados en las últimas 24 hs
//   * avisa una sola vez por postulante (app_metadata.notificado)
//   * el token de aprobación lo genera acá el servidor y va en app_metadata (el usuario no lo puede
//     editar, a diferencia de user_metadata). Solo viaja dentro del correo.
//
// Secrets: RESEND_API_KEY y APP_URL (dirección web de la app, para los enlaces).
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya los provee Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { cors, json } from '../_shared/cors.ts';
import { generarHtmlEmailCoordinador } from '../_shared/emailCoordinador.ts';

const VENTANA_MS = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let id = '';
  try {
    id = String((await req.json()).id ?? '');
  } catch {
    return json({ error: 'Cuerpo inválido' }, 400);
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Identificador inválido' }, 400);

  const { data: u } = await admin.auth.admin.getUserById(id);
  const { data: perfil } = await admin.from('perfiles').select('*').eq('id', id).maybeSingle();
  if (!u?.user || !perfil) return json({ error: 'Postulante no encontrado' }, 404);
  if (perfil.aprobado) return json({ error: 'La cuenta ya fue aprobada' }, 409);
  if (Date.now() - new Date(u.user.created_at).getTime() > VENTANA_MS) {
    return json({ error: 'La postulación es demasiado antigua' }, 409);
  }
  if (u.user.app_metadata?.notificado) return json({ enviados: 0, total: 0, yaNotificado: true });

  const resend = Deno.env.get('RESEND_API_KEY');
  if (!resend) return json({ error: 'Falta configurar RESEND_API_KEY' }, 500);

  const { data: coords } = await admin
    .from('perfiles')
    .select('nombre, email')
    .eq('rol', 'coordinador')
    .eq('aprobado', true);
  const destinatarios = (coords ?? []).filter((c) => c.email);
  if (destinatarios.length === 0) return json({ error: 'No hay coordinadores para avisar' }, 422);

  const token = crypto.randomUUID();
  await admin.auth.admin.updateUserById(id, {
    app_metadata: { ...u.user.app_metadata, token_aprobacion: token },
  });

  const base = (Deno.env.get('APP_URL') ?? 'http://localhost:8081').replace(/\/$/, '');
  const enlace = (accion: string) =>
    `${base}/?accion=${accion}&id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
  const urlAprobar = enlace('aprobar_voluntario');
  const urlRechazar = enlace('rechazar_voluntario');

  const datos = {
    id,
    nombre: perfil.nombre,
    email: perfil.email,
    telefono: perfil.telefono ?? '',
    zona: perfil.zona ?? '',
    brigada: perfil.brigada,
    recursos: perfil.recursos ?? [],
    tokenAprobacion: token,
    fechaSolicitud: u.user.created_at,
  };

  let enviados = 0;
  for (const c of destinatarios) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resend}` },
      body: JSON.stringify({
        from: 'PERF Móvil <onboarding@resend.dev>',
        to: [c.email],
        subject: `Nueva solicitud de voluntario: ${datos.nombre} (${datos.zona})`,
        html: generarHtmlEmailCoordinador(datos, urlAprobar, urlRechazar, c.nombre || 'Coordinador PERF'),
      }),
    });
    if (res.ok) enviados++;
  }

  if (enviados > 0) {
    await admin.auth.admin.updateUserById(id, {
      app_metadata: { ...u.user.app_metadata, token_aprobacion: token, notificado: true },
    });
  }
  return json({ enviados, total: destinatarios.length });
});
