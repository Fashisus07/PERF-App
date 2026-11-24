import { adminSupabase } from './supabaseClient';

export interface DatosNuevoVoluntario {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  zona: string;
  brigada: string;
  recursos: string[];
  tokenAprobacion: string;
  fechaSolicitud?: string;
}

export interface CoordinadorInfo {
  nombre: string;
  email: string;
}

const COORDINADOR_DEFAULT: CoordinadorInfo = {
  nombre: 'Facundo Pérez Espinosa (Coordinador PERF)',
  email: 'facuperezespinosa@gmail.com',
};

function normalizarRecurso(id: string): string {
  switch (id) {
    case 'canil':
      return 'Canil propio (rígido / jaula trampa)';
    case 'movil':
      return 'Móvil / Auto propio para traslados';
    case 'transito':
      return 'Hogar de tránsito (habitación de aislamiento)';
    default:
      return id;
  }
}

/**
 * Genera la plantilla HTML responsive para el correo a coordinadores.
 */
export function generarHtmlEmailCoordinador(
  datos: DatosNuevoVoluntario,
  urlAprobar: string,
  urlRechazar: string,
  coordinadorNombre: string
): string {
  const fechaFormateada = datos.fechaSolicitud
    ? new Date(datos.fechaSolicitud).toLocaleString('es-AR', {
        dateStyle: 'full',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' });

  const telSoloDigitos = (datos.telefono || '').replace(/\D/g, '');
  const waUrl = telSoloDigitos
    ? `https://wa.me/549${telSoloDigitos}?text=Hola%20${encodeURIComponent(
        datos.nombre
      )}%2C%20nos%20comunicamos%20desde%20la%20coordinaci%C3%B3n%20de%20PERF%20M%C3%B3vil`
    : null;

  const recursosHtml =
    datos.recursos && datos.recursos.length > 0
      ? datos.recursos
          .map(
            (r) =>
              `<li style="margin-bottom: 6px; color: #111827; font-size: 14px;"><strong>✓</strong> ${normalizarRecurso(
                r
              )}</li>`
          )
          .join('')
      : '<li style="color: #6B7280; font-style: italic;">Sin recursos declarados al momento del alta</li>';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PERF Móvil · Nueva Solicitud de Voluntario</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F3F4F6; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #E5E7EB;">
          <!-- Header -->
          <tr>
            <td style="background-color: #005C55; padding: 28px 24px; text-align: center;">
              <span style="font-size: 32px; display: block; margin-bottom: 8px;">🐾</span>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">PERF Móvil · Red de Rescate Felino</h1>
              <p style="margin: 6px 0 0 0; color: #9cf2e8; font-size: 14px; font-weight: 500;">Panel de Coordinación y Aprobación de Voluntarios</p>
            </td>
          </tr>

          <!-- Contenido -->
          <tr>
            <td style="padding: 28px 24px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #374151;">
                Hola <strong>${coordinadorNombre}</strong>, se registró una nueva postulación para ingresar como voluntario en la red de rescate:
              </p>

              <!-- Tarjeta de Datos -->
              <table role="presentation" width="100%" style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <table role="presentation" width="100%">
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #6B7280; width: 140px;">Nombre y Apellido:</td>
                        <td style="padding: 6px 0; font-size: 15px; font-weight: 600; color: #111827;">${datos.nombre}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #6B7280;">Correo electrónico:</td>
                        <td style="padding: 6px 0; font-size: 15px; color: #005C55; font-weight: 500;">
                          <a href="mailto:${datos.email}" style="color: #005C55; text-decoration: underline;">${datos.email}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #6B7280;">Teléfono / WhatsApp:</td>
                        <td style="padding: 6px 0; font-size: 15px; color: #111827;">
                          ${datos.telefono}
                          ${
                            waUrl
                              ? ` <a href="${waUrl}" target="_blank" style="display: inline-block; margin-left: 8px; background-color: #25D366; color: #FFFFFF; padding: 2px 8px; border-radius: 12px; font-size: 11px; text-decoration: none; font-weight: 600;">Abrir WhatsApp</a>`
                              : ''
                          }
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #6B7280;">Zona y Brigada:</td>
                        <td style="padding: 6px 0; font-size: 15px; color: #111827;">
                          <span style="background-color: #E6F4F2; color: #005C55; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 13px;">${datos.brigada || `Brigada ${datos.zona}`}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #6B7280; vertical-align: top;">Recursos de guardia:</td>
                        <td style="padding: 6px 0;">
                          <ul style="margin: 0; padding-left: 16px;">
                            ${recursosHtml}
                          </ul>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #6B7280;">Fecha de solicitud:</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #6B7280;">${fechaFormateada}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Botones de Acción -->
              <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #111827; text-align: center;">
                Seleccioná una acción para gestionar esta solicitud:
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="padding: 8px;">
                    <!-- Botón Aceptar -->
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                      <tr>
                        <td align="center" style="background-color: #005C55; border-radius: 10px;">
                          <a href="${urlAprobar}" target="_blank" style="display: block; padding: 14px 28px; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px; min-width: 220px; text-align: center;">
                            ✓ ACEPTAR Y HABILITAR VOLUNTARIO
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Botón Rechazar -->
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="background-color: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 10px;">
                          <a href="${urlRechazar}" target="_blank" style="display: block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #DC2626; text-decoration: none; border-radius: 10px; min-width: 220px; text-align: center;">
                            ✕ RECHAZAR Y BORRAR SOLICITUD
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Aclaración y advertencia -->
              <div style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 14px; border-radius: 6px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 12.5px; line-height: 18px; color: #92400E;">
                  <strong>Importante:</strong><br>
                  • Al <strong>Aceptar</strong>, el voluntario queda validado en el sistema y podrá iniciar sesión inmediatamente.<br>
                  • Al <strong>Rechazar</strong>, toda la información de este perfil y su cuenta se <strong>eliminarán definitivamente de la base de datos</strong>.
                </p>
              </div>

              <p style="margin: 0; font-size: 12px; color: #9CA3AF; text-align: center;">
                También podés gestionar todas las postulaciones directamente desde la app en <strong>Ajustes &gt; Solicitudes de Voluntarios</strong>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 16px 24px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                PERF Móvil · Sistema Offline First para Rescate y Bienestar Felino · UADE
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Obtiene la lista de todos los coordinadores activos del sistema.
 */
export async function obtenerCoordinadores(): Promise<CoordinadorInfo[]> {
  try {
    const { data, error } = await adminSupabase
      .from('perfiles')
      .select('nombre, email')
      .eq('rol', 'coordinador')
      .eq('aprobado', true);

    if (error || !data || data.length === 0) {
      return [COORDINADOR_DEFAULT];
    }

    return data.map((c) => ({
      nombre: c.nombre || 'Coordinador PERF',
      email: c.email,
    }));
  } catch {
    return [COORDINADOR_DEFAULT];
  }
}

/**
 * Notifica a todos los coordinadores por correo electrónico ante una nueva postulación.
 */
export async function notificarCoordinadoresNuevoVoluntario(
  datos: DatosNuevoVoluntario
): Promise<{ enviados: number; total: number }> {
  const coordinadores = await obtenerCoordinadores();

  // Determinar origen base de la aplicación para los enlaces de acción
  let baseUrl = 'http://localhost:8081';
  if (typeof window !== 'undefined' && window.location?.origin) {
    baseUrl = window.location.origin;
  }

  const urlAprobar = `${baseUrl}/?accion=aprobar_voluntario&id=${encodeURIComponent(
    datos.id
  )}&token=${encodeURIComponent(datos.tokenAprobacion)}`;

  const urlRechazar = `${baseUrl}/?accion=rechazar_voluntario&id=${encodeURIComponent(
    datos.id
  )}&token=${encodeURIComponent(datos.tokenAprobacion)}`;

  // Log visible en consola para trazabilidad y pruebas locales
  console.log('\n========================================================================');
  console.log('🐾 [PERF NOTIFICACIÓN] NUEVA POSTULACIÓN DE VOLUNTARIO');
  console.log(`📋 Postulante: ${datos.nombre} (${datos.email}) - Tel: ${datos.telefono}`);
  console.log(`📍 Brigada: ${datos.brigada || datos.zona} | Recursos: [${datos.recursos?.join(', ') || 'ninguno'}]`);
  console.log(`👥 Destinatarios coordinadores (${coordinadores.length}):`);
  coordinadores.forEach((c) => console.log(`   - ${c.nombre} <${c.email}>`));
  console.log('------------------------------------------------------------------------');
  console.log('👉 ENLACE PARA APROBAR SOLICITUD:');
  console.log(`   ${urlAprobar}`);
  console.log('👉 ENLACE PARA RECHAZAR Y BORRAR SOLICITUD:');
  console.log(`   ${urlRechazar}`);
  console.log('========================================================================\n');

  let enviados = 0;
  const resendApiKey =
    process.env.EXPO_PUBLIC_RESEND_API_KEY || process.env.RESEND_API_KEY;
  const webhookUrl = process.env.EXPO_PUBLIC_EMAIL_WEBHOOK_URL;

  for (const coord of coordinadores) {
    const html = generarHtmlEmailCoordinador(datos, urlAprobar, urlRechazar, coord.nombre);

    // 1. Envío vía Resend API (si está configurada la API Key)
    if (resendApiKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'PERF Móvil <onboarding@resend.dev>',
            to: [coord.email],
            subject: `🐾 Nueva solicitud de voluntario: ${datos.nombre} (${datos.zona})`,
            html,
          }),
        });
        if (res.ok) {
          enviados++;
        }
      } catch (err) {
        console.warn(`[PERF NOTIFICACIÓN] Error enviando correo vía Resend a ${coord.email}:`, err);
      }
    }

    // 2. Envío alternativo vía Webhook si está definido
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'NUEVO_VOLUNTARIO',
            destinatario: coord.email,
            coordinador: coord.nombre,
            postulante: datos,
            urlAprobar,
            urlRechazar,
            html,
          }),
        });
        enviados++;
      } catch (err) {
        console.warn(`[PERF NOTIFICACIÓN] Error enviando a webhook:`, err);
      }
    }
  }

  return { enviados, total: coordinadores.length };
}
