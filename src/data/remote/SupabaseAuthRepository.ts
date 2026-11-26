import AsyncStorage from '@react-native-async-storage/async-storage';
import { Voluntario } from '../../domain/models/Ajustes';
import {
  AuthRepository,
  CredencialesRegistro,
  ResultadoAccionSolicitud,
  ResultadoRegistro,
  SolicitudVoluntarioPendiente,
} from '../../domain/repositories/AuthRepository';
import { generarUUID } from '../local/uuid';
import { notificarCoordinadoresNuevoVoluntario } from './NotificacionesCoordinadoresService';
import { adminSupabase, supabase, SUPABASE_URL } from './supabaseClient';

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
  rol?: string;
  aprobado: boolean;
}

const MENSAJE_PENDIENTE =
  'Tu cuenta todavía no fue aprobada. Un coordinador de PERF tiene que habilitarla para que puedas ver los casos.';

function aVoluntario(p: PerfilRow): Voluntario {
  return {
    id: p.id,
    nombre: p.nombre,
    brigada: p.brigada,
    email: p.email,
    telefono: p.telefono ?? '',
    zona: p.zona ?? '',
    recursos: p.recursos ?? [],
    rol: (p.rol as any) ?? 'voluntario',
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
    if (!process.env.EXPO_PUBLIC_SUPABASE_URL || SUPABASE_URL.includes('kdnosvxrgoxsopmzkghh')) {
      return new Error(
        'El servidor remoto de Supabase no está configurado o el proyecto por defecto está inactivo. Podés configurar un proyecto en tu archivo .env o continuar en Modo Offline.'
      );
    }
    return new Error('Sin conexión con el servidor de Supabase. Verificá tu acceso a internet.');
  }
  return new Error(error.message || 'Error de conexión con el servidor');
}

export class SupabaseAuthRepository implements AuthRepository {
  private async leerPerfil(userId: string): Promise<PerfilRow | null> {
    const { data, error } = await supabase
      .from('perfiles')
      .select('id, nombre, email, telefono, brigada, zona, recursos, rol, aprobado')
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
    const tokenAprobacion = generarUUID();

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
          token_aprobacion: tokenAprobacion,
          fecha_solicitud: new Date().toISOString(),
        },
      },
    });
    if (error) throw traducirError(error);
    if (!data.user) throw new Error('No se pudo crear la cuenta. Intentá nuevamente.');

    if (data.user?.identities && data.user.identities.length === 0) {
      throw new Error('Ya existe una cuenta registrada con este correo electrónico.');
    }

    // Asegurar recursos en tabla perfiles mediante adminSupabase
    try {
      if (datos.recursos?.length) {
        await adminSupabase.from('perfiles').update({ recursos: datos.recursos }).eq('id', data.user.id);
      }
    } catch {}

    // Notificar a todos los coordinadores por correo con los botones de acción
    try {
      await notificarCoordinadoresNuevoVoluntario({
        id: data.user.id,
        nombre: datos.nombre.trim(),
        email,
        telefono: datos.telefono.trim(),
        zona: datos.zona.trim(),
        brigada: `Brigada ${datos.zona.trim()}`,
        recursos: datos.recursos ?? [],
        tokenAprobacion,
        fechaSolicitud: new Date().toISOString(),
      });
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
            recursos: Array.isArray(m.recursos) ? m.recursos : [],
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
   * Obtiene la lista de todos los voluntarios pendientes de aprobación.
   */
  async obtenerVoluntariosPendientes(): Promise<SolicitudVoluntarioPendiente[]> {
    try {
      const { data, error } = await adminSupabase
        .from('perfiles')
        .select('id, nombre, email, telefono, brigada, zona, recursos, rol, aprobado, created_at')
        .eq('aprobado', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      // Obtener metadatos de auth para tokens de aprobación
      const { data: usersData } = await adminSupabase.auth.admin.listUsers();
      const userMap = new Map((usersData?.users || []).map((u) => [u.id, u]));

      return data.map((p) => {
        const authUser = userMap.get(p.id);
        const token = authUser?.user_metadata?.token_aprobacion;
        return {
          id: p.id,
          nombre: p.nombre,
          email: p.email,
          telefono: p.telefono ?? authUser?.user_metadata?.telefono ?? '',
          zona: p.zona ?? authUser?.user_metadata?.zona ?? '',
          brigada: p.brigada,
          recursos: p.recursos ?? authUser?.user_metadata?.recursos ?? [],
          rol: (p.rol as any) ?? 'voluntario',
          aprobado: p.aprobado,
          tokenAprobacion: token,
          createdAt: p.created_at,
        };
      });
    } catch (err: any) {
      console.warn('[SupabaseAuthRepository] Error al obtener voluntarios pendientes:', err);
      return [];
    }
  }

  /**
   * Aprueba una postulación de voluntario.
   * Marca aprobado = true en perfiles y limpia el token de un solo uso.
   */
  async aprobarVoluntario(userId: string, token?: string): Promise<ResultadoAccionSolicitud> {
    try {
      if (token) {
        const { data: user } = await adminSupabase.auth.admin.getUserById(userId);
        const tokenEsperado = user?.user?.user_metadata?.token_aprobacion;
        if (tokenEsperado && tokenEsperado !== token) {
          throw new Error('El enlace de aprobación es inválido o ya fue utilizado.');
        }
      }

      // 1. Marcar como aprobado en perfiles
      const { data: perfil, error: perfilErr } = await adminSupabase
        .from('perfiles')
        .update({ aprobado: true })
        .eq('id', userId)
        .select('nombre, email')
        .single();

      if (perfilErr) throw perfilErr;

      // 2. Limpiar token_aprobacion en user_metadata y fijar aprobado
      await adminSupabase.auth.admin.updateUserById(userId, {
        user_metadata: { token_aprobacion: null, aprobado: true },
      });

      return {
        success: true,
        mensaje: `El voluntario ${perfil?.nombre || ''} (${perfil?.email || ''}) fue aprobado con éxito. Ya puede iniciar sesión.`,
        nombre: perfil?.nombre,
        email: perfil?.email,
      };
    } catch (err: any) {
      return {
        success: false,
        mensaje: err?.message || 'Error al aprobar voluntario.',
      };
    }
  }

  /**
   * Rechaza una postulación de voluntario.
   * Borra toda la información de ese perfil y de auth.users de la base de datos.
   */
  async rechazarVoluntario(userId: string, token?: string): Promise<ResultadoAccionSolicitud> {
    try {
      if (token) {
        const { data: user } = await adminSupabase.auth.admin.getUserById(userId);
        const tokenEsperado = user?.user?.user_metadata?.token_aprobacion;
        if (tokenEsperado && tokenEsperado !== token) {
          throw new Error('El enlace de rechazo es inválido o ya fue utilizado.');
        }
      }

      // Obtener datos del postulante antes de borrar para el feedback
      let nombre = 'Voluntario';
      let email = '';
      try {
        const { data: p } = await adminSupabase
          .from('perfiles')
          .select('nombre, email')
          .eq('id', userId)
          .maybeSingle();
        if (p) {
          nombre = p.nombre;
          email = p.email;
        }
      } catch {}

      // 1. Eliminar usuario de auth.users (cascada automática a perfiles)
      const { error: authErr } = await adminSupabase.auth.admin.deleteUser(userId);
      if (authErr) {
        console.warn('[SupabaseAuthRepository] Advertencia al borrar de auth.users:', authErr);
      }

      // 2. Borrado explícito de perfiles por seguridad
      await adminSupabase.from('perfiles').delete().eq('id', userId);

      return {
        success: true,
        mensaje: `La solicitud de ${nombre} fue rechazada y todos sus datos fueron eliminados permanentemente de la base de datos.`,
        nombre,
        email,
      };
    } catch (err: any) {
      return {
        success: false,
        mensaje: err?.message || 'Error al rechazar y eliminar voluntario.',
      };
    }
  }
}
