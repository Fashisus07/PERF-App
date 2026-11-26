import AsyncStorage from '@react-native-async-storage/async-storage';
import { esAdministrador, RolVoluntario, Voluntario } from '../../domain/models/Ajustes';
import {
  AuthRepository,
  CredencialesRegistro,
  ResultadoAccionSolicitud,
  ResultadoRegistro,
  SolicitudVoluntarioPendiente,
} from '../../domain/repositories/AuthRepository';
import { generarUUID } from '../local/uuid';
import { notificarCoordinadoresNuevoVoluntario } from './NotificacionesCoordinadoresService';
import { supabase } from './supabaseClient';

export const VOLUNTARIO_DEMO: Voluntario = {
  id: 'voluntario-demo',
  nombre: 'Facundo Pérez Espinosa',
  brigada: 'Brigada Caballito',
  email: 'facuperezespinosa@gmail.com',
  telefono: '1155551234',
  zona: 'Caballito',
  recursos: ['canil', 'transito'],
};

const CLAVE_SESION_LOCAL = '@perf_sesion_local';

interface PerfilRow {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  brigada: string;
  zona: string | null;
  recursos: string[] | null;
  rol?: string | null;
  aprobado: boolean;
}

const COLUMNAS_PERFIL = 'id, nombre, email, telefono, brigada, zona, recursos, rol, aprobado';

const MENSAJE_PENDIENTE =
  'Tu cuenta todavía no fue aprobada. Un coordinador de PERF tiene que habilitarla para que puedas ver los casos.';

/** En la base el administrador es el único con rol 'coordinador' (se muestra como "Administrador"). */
function aRol(rol?: string | null): RolVoluntario {
  return rol === 'coordinador' || rol === 'administrador' ? 'coordinador' : 'voluntario';
}

function aVoluntario(p: PerfilRow): Voluntario {
  return {
    id: p.id,
    nombre: p.nombre,
    brigada: p.brigada,
    email: p.email,
    telefono: p.telefono ?? '',
    zona: p.zona ?? '',
    recursos: p.recursos ?? [],
    rol: aRol(p.rol),
    aprobado: p.aprobado,
  };
}

/** Traduce los errores de Supabase Auth a mensajes para el voluntario. */
function traducirError(error: { message: string; status?: number }): Error {
  const m = (error?.message || '').toLowerCase();
  if (m.includes('invalid login credentials')) return new Error('Correo o contraseña incorrectos.');
  if (m.includes('already registered')) return new Error('Ya existe una cuenta registrada con este correo electrónico.');
  if (m.includes('rate limit')) return new Error('Demasiados intentos. Esperá unos minutos y volvé a probar.');
  if (m.includes('password')) return new Error('La contraseña no cumple los requisitos (mínimo 6 caracteres).');
  if (m.includes('network') || m.includes('fetch')) {
    // Sin internet o con el proyecto de Supabase pausado (los gratuitos se pausan tras una semana sin uso).
    return new Error(
      'No se pudo conectar con el servidor. Verificá tu internet; si el proyecto de Supabase está pausado, restauralo desde su panel. Podés continuar en Modo Offline.'
    );
  }
  return new Error(error.message || 'Error de conexión con el servidor');
}

export class SupabaseAuthRepository implements AuthRepository {
  private async leerPerfil(userId: string): Promise<PerfilRow | null> {
    const { data, error } = await supabase
      .from('perfiles')
      .select(COLUMNAS_PERFIL)
      .eq('id', userId)
      .maybeSingle();
    if (error) throw traducirError(error);
    return data as PerfilRow | null;
  }

  async iniciarSesion(usuarioOEmail: string, clave: string): Promise<Voluntario> {
    const email = usuarioOEmail.trim().toLowerCase();
    if (!email.includes('@')) throw new Error('Ingresá tu correo electrónico.');

    // Acceso para voluntario de prueba / demo
    if (email === 'demo@perfelino.org' || email === 'voluntario@perfelino.org') {
      await AsyncStorage.setItem(CLAVE_SESION_LOCAL, JSON.stringify(VOLUNTARIO_DEMO));
      return VOLUNTARIO_DEMO;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: clave });
      if (error) throw error;

      const perfil = await this.leerPerfil(data.user.id);
      if (perfil && !perfil.aprobado && perfil.rol !== 'coordinador') {
        await supabase.auth.signOut();
        throw new Error(MENSAJE_PENDIENTE);
      }
      if (perfil) {
        return aVoluntario(perfil);
      }
      return {
        id: data.user.id,
        nombre: data.user.user_metadata?.nombre || 'Voluntario',
        brigada: data.user.user_metadata?.brigada || 'Brigada General',
        email,
        telefono: data.user.user_metadata?.telefono || '',
        zona: data.user.user_metadata?.zona || '',
        recursos: [],
      };
    } catch (err: any) {
      // Si hay una cuenta local previa creada sin conexión con este correo
      const local = await AsyncStorage.getItem(CLAVE_SESION_LOCAL);
      if (local) {
        try {
          const vol: Voluntario = JSON.parse(local);
          if (vol.email?.toLowerCase() === email) {
            return vol;
          }
        } catch {}
      }
      throw traducirError(err);
    }
  }

  async iniciarSesionComoDemo(): Promise<Voluntario> {
    await AsyncStorage.setItem(CLAVE_SESION_LOCAL, JSON.stringify(VOLUNTARIO_DEMO));
    return VOLUNTARIO_DEMO;
  }

  async registrar(datos: CredencialesRegistro): Promise<ResultadoRegistro> {
    const email = datos.email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: datos.clave,
      options: {
        data: {
          nombre: datos.nombre.trim(),
          telefono: datos.telefono.trim(),
          zona: datos.zona.trim(),
          brigada: `Brigada ${datos.zona.trim()}`,
          recursos: datos.recursos ?? [],
          fecha_solicitud: new Date().toISOString(),
        },
      },
    });
    if (error) throw traducirError(error);
    if (!data.user) throw new Error('No se pudo crear la cuenta. Intentá nuevamente.');

    if (data.user?.identities && data.user.identities.length === 0) {
      throw new Error('Ya existe una cuenta registrada con este correo electrónico.');
    }

    // Los recursos viajan en los datos del registro y el trigger de la base los copia al perfil.
    // Avisar a los coordinadores es trabajo del servidor (Edge Function), no de la app.
    try {
      await notificarCoordinadoresNuevoVoluntario(data.user.id);
    } catch (errNotif) {
      console.warn('[SupabaseAuthRepository] Error notificando a coordinadores:', errNotif);
    }

    if (!data.session) {
      return {
        pendienteDeAprobacion: true,
        mensaje: `Te enviamos un correo de confirmación a ${email}. Además, los coordinadores de PERF ya recibieron tu postulación para revisarla.`,
      };
    }

    await supabase.auth.signOut();
    return { pendienteDeAprobacion: true, mensaje: MENSAJE_PENDIENTE };
  }

  async registrarOffline(datos: CredencialesRegistro): Promise<Voluntario> {
    const email = datos.email.trim().toLowerCase();
    const nuevoVoluntario: Voluntario = {
      id: generarUUID(),
      nombre: datos.nombre.trim(),
      brigada: `Brigada ${datos.zona.trim() || 'Caballito'}`,
      email,
      telefono: datos.telefono.trim(),
      zona: datos.zona.trim(),
      recursos: datos.recursos ?? [],
    };
    await AsyncStorage.setItem(CLAVE_SESION_LOCAL, JSON.stringify(nuevoVoluntario));
    return nuevoVoluntario;
  }

  async obtenerVoluntarioActual(): Promise<Voluntario | null> {
    // 1. Verificar sesión activa de Supabase
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        try {
          const perfil = await this.leerPerfil(data.session.user.id);
          if (perfil?.aprobado) return aVoluntario(perfil);
        } catch {
          // En modo avión sin conexión a base, pero con token válido
          const u = data.session.user;
          const m = u.user_metadata ?? {};
          return {
            id: u.id,
            nombre: m.nombre ?? '',
            brigada: m.brigada ?? '',
            email: u.email ?? '',
            telefono: m.telefono ?? '',
            zona: m.zona ?? '',
            recursos: [],
          };
        }
      }
    } catch {}

    // 2. Verificar si existe una sesión de voluntario local en AsyncStorage (Modo Offline)
    try {
      const local = await AsyncStorage.getItem(CLAVE_SESION_LOCAL);
      if (local) {
        return JSON.parse(local);
      }
    } catch {}

    return null;
  }

  async cerrarSesion(): Promise<void> {
    await AsyncStorage.removeItem(CLAVE_SESION_LOCAL);
    try {
      await supabase.auth.signOut();
    } catch {}
  }

  async actualizarVoluntario(voluntario: Voluntario): Promise<Voluntario> {
    if (!voluntario.id) throw new Error('No hay un voluntario con sesión iniciada.');

    // Actualiza en almacenamiento local
    await AsyncStorage.setItem(CLAVE_SESION_LOCAL, JSON.stringify(voluntario));

    // Si hay conexión con Supabase, actualiza también en la nube
    try {
      await supabase
        .from('perfiles')
        .update({
          nombre: voluntario.nombre,
          telefono: voluntario.telefono ?? '',
          zona: voluntario.zona ?? '',
          brigada: voluntario.brigada,
          recursos: voluntario.recursos ?? [],
        })
        .eq('id', voluntario.id);
    } catch {}

    return voluntario;
  }

  async listarVoluntarios(): Promise<Voluntario[]> {
    const { data, error } = await supabase
      .from('perfiles')
      .select(COLUMNAS_PERFIL)
      .eq('aprobado', true)
      .order('nombre', { ascending: true });
    if (error) throw traducirError(error);
    const lista = ((data ?? []) as PerfilRow[]).map(aVoluntario);
    // El administrador primero, después el resto por orden alfabético.
    return lista.sort((a, b) => Number(esAdministrador(b.rol)) - Number(esAdministrador(a.rol)));
  }

  async obtenerVoluntario(id: string): Promise<Voluntario | null> {
    const perfil = await this.leerPerfil(id);
    return perfil ? aVoluntario(perfil) : null;
  }

  async recuperarClave(email: string): Promise<boolean> {
    const limpio = email.trim().toLowerCase();
    if (!limpio.includes('@')) throw new Error('Ingresá un correo electrónico válido');
    let redirectTo: string | undefined = undefined;
    if (typeof window !== 'undefined' && window.location?.origin) {
      redirectTo = window.location.origin;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(limpio, {
      redirectTo,
    });
    if (error) throw traducirError(error);
    return true;
  }

  async cambiarClave(nuevaClave: string): Promise<void> {
    const clave = (nuevaClave || '').trim();
    if (clave.length < 6) {
      throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
    }
    const { error } = await supabase.auth.updateUser({ password: clave });
    if (error) throw traducirError(error);
  }

  /**
   * Obtiene los voluntarios pendientes de aprobación. Lo permiten las políticas RLS solo al
   * administrador (coordinador); para cualquier otra sesión la lista viene vacía.
   */
  async obtenerVoluntariosPendientes(): Promise<SolicitudVoluntarioPendiente[]> {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('id, nombre, email, telefono, brigada, zona, recursos, rol, aprobado, created_at')
        .eq('aprobado', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        email: p.email,
        telefono: p.telefono ?? '',
        zona: p.zona ?? '',
        brigada: p.brigada,
        recursos: p.recursos ?? [],
        rol: (p.rol as any) ?? 'voluntario',
        aprobado: p.aprobado,
        createdAt: p.created_at,
      }));
    } catch (err: any) {
      console.warn('[SupabaseAuthRepository] Error al obtener voluntarios pendientes:', err);
      return [];
    }
  }

  /**
   * Aprueba una postulación. Con `token` (enlace del correo, sin sesión) lo valida la Edge Function
   * `gestionar-voluntario`; sin token (desde la app) es el administrador con su sesión, y la base
   * verifica que lo sea (`aprobar_voluntario`).
   */
  async aprobarVoluntario(userId: string, token?: string): Promise<ResultadoAccionSolicitud> {
    return this.gestionarSolicitud('aprobar', userId, token);
  }

  /**
   * Rechaza una postulación y borra la cuenta y el perfil. Mismo esquema que `aprobarVoluntario`.
   */
  async rechazarVoluntario(userId: string, token?: string): Promise<ResultadoAccionSolicitud> {
    return this.gestionarSolicitud('rechazar', userId, token);
  }

  private async gestionarSolicitud(
    accion: 'aprobar' | 'rechazar',
    userId: string,
    token?: string
  ): Promise<ResultadoAccionSolicitud> {
    try {
      if (token) {
        const { data, error } = await supabase.functions.invoke('gestionar-voluntario', {
          body: { accion, id: userId, token },
        });
        // Si la función respondió con un error de negocio, el mensaje viene en el cuerpo.
        const cuerpo = data ?? (await leerCuerpoError(error));
        if (error && !cuerpo?.mensaje) throw error;
        return {
          success: !!cuerpo?.success,
          mensaje: cuerpo?.mensaje ?? 'No se pudo procesar la solicitud.',
          nombre: cuerpo?.nombre,
          email: cuerpo?.email,
        };
      }

      const { data, error } = await supabase.rpc(
        accion === 'aprobar' ? 'aprobar_voluntario' : 'rechazar_voluntario',
        { p_user_id: userId }
      );
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'No se pudo procesar la solicitud.');
      return {
        success: true,
        mensaje:
          accion === 'aprobar'
            ? `El voluntario ${data.nombre} (${data.email}) fue aprobado con éxito. Ya puede iniciar sesión.`
            : `La solicitud de ${data.nombre} fue rechazada y sus datos fueron eliminados de la base de datos.`,
        nombre: data.nombre,
        email: data.email,
      };
    } catch (err: any) {
      return {
        success: false,
        mensaje: err?.message || 'Error al procesar la solicitud.',
      };
    }
  }
}

/** Lee el cuerpo JSON de un error HTTP de una Edge Function, si lo trae. */
async function leerCuerpoError(error: any): Promise<any | null> {
  try {
    return await error?.context?.json?.();
  } catch {
    return null;
  }
}
