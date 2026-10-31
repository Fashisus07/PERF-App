import { Voluntario } from '../../domain/models/Ajustes';
import {
  AuthRepository,
  CredencialesRegistro,
  ResultadoRegistro,
} from '../../domain/repositories/AuthRepository';
import { supabase } from './supabaseClient';

interface PerfilRow {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  brigada: string;
  zona: string | null;
  recursos: string[] | null;
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
  };
}

/** Traduce los errores de Supabase Auth a mensajes para el voluntario. */
function traducirError(error: { message: string; status?: number }): Error {
  const m = error.message.toLowerCase();
  if (m.includes('invalid login credentials')) return new Error('Correo o contraseña incorrectos.');
  if (m.includes('already registered')) return new Error('Ya existe una cuenta registrada con este correo electrónico.');
  if (m.includes('rate limit')) return new Error('Demasiados intentos. Esperá unos minutos y volvé a probar.');
  if (m.includes('password')) return new Error('La contraseña no cumple los requisitos (mínimo 6 caracteres).');
  if (m.includes('network') || m.includes('fetch')) return new Error('Sin conexión. Conectate a internet para iniciar sesión.');
  return new Error(error.message);
}

export class SupabaseAuthRepository implements AuthRepository {
  private async leerPerfil(userId: string): Promise<PerfilRow | null> {
    const { data, error } = await supabase
      .from('perfiles')
      .select('id, nombre, email, telefono, brigada, zona, recursos, aprobado')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw traducirError(error);
    return data as PerfilRow | null;
  }

  async iniciarSesion(usuarioOEmail: string, clave: string): Promise<Voluntario> {
    const email = usuarioOEmail.trim().toLowerCase();
    if (!email.includes('@')) throw new Error('Ingresá tu correo electrónico.');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: clave });
    if (error) throw traducirError(error);

    const perfil = await this.leerPerfil(data.user.id);
    if (!perfil?.aprobado) {
      await supabase.auth.signOut();
      throw new Error(MENSAJE_PENDIENTE);
    }
    return aVoluntario(perfil);
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
        },
      },
    });
    if (error) throw traducirError(error);
    if (!data.user) throw new Error('No se pudo crear la cuenta. Intentá nuevamente.');

    // Con la confirmación por mail apagada, signUp ya deja la sesión abierta: aprovechamos para
    // guardar los recursos (el perfil lo creó un trigger del servidor) y cerramos la sesión, porque
    // la cuenta queda pendiente hasta que un coordinador la apruebe.
    if (data.session && datos.recursos?.length) {
      await supabase.from('perfiles').update({ recursos: datos.recursos }).eq('id', data.user.id);
    }
    await supabase.auth.signOut();

    return { pendienteDeAprobacion: true, mensaje: MENSAJE_PENDIENTE };
  }

  async obtenerVoluntarioActual(): Promise<Voluntario | null> {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return null;
    try {
      const perfil = await this.leerPerfil(data.session.user.id);
      return perfil?.aprobado ? aVoluntario(perfil) : null;
    } catch {
      // Sin conexión no se puede leer el perfil. La sesión solo queda guardada si la cuenta ya estaba
      // aprobada (iniciarSesion cierra la sesión si no), así que se entra con los datos de la sesión.
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

  async cerrarSesion(): Promise<void> {
    await supabase.auth.signOut();
  }

  async actualizarVoluntario(voluntario: Voluntario): Promise<Voluntario> {
    if (!voluntario.id) throw new Error('No hay un voluntario con sesión iniciada.');
    const { error } = await supabase
      .from('perfiles')
      .update({
        nombre: voluntario.nombre,
        telefono: voluntario.telefono ?? '',
        zona: voluntario.zona ?? '',
        brigada: voluntario.brigada,
        recursos: voluntario.recursos ?? [],
      })
      .eq('id', voluntario.id);
    if (error) throw traducirError(error);
    return voluntario;
  }

  async recuperarClave(email: string): Promise<boolean> {
    const limpio = email.trim().toLowerCase();
    if (!limpio.includes('@')) throw new Error('Ingresá un correo electrónico válido');
    // Siempre devolvemos éxito para no revelar qué correos están registrados.
    await supabase.auth.resetPasswordForEmail(limpio);
    return true;
  }
}
