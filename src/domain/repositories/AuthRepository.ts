import { Voluntario } from '../models/Ajustes';

export interface CredencialesRegistro {
  nombre: string;
  email: string;
  telefono: string;
  clave: string;
  zona: string;
  recursos?: string[];
}

export interface ResultadoRegistro {
  /** Las cuentas nuevas quedan pendientes hasta que un coordinador las aprueba. */
  pendienteDeAprobacion: boolean;
  mensaje: string;
}

export interface ResultadoAccionSolicitud {
  success: boolean;
  mensaje: string;
  nombre?: string;
  email?: string;
}

export interface SolicitudVoluntarioPendiente extends Voluntario {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  zona: string;
  brigada: string;
  recursos: string[];
  tokenAprobacion?: string;
  createdAt?: string;
}

export interface AuthRepository {
  /** Falla si las credenciales son incorrectas o la cuenta todavía no fue aprobada. */
  iniciarSesion(usuarioOEmail: string, clave: string): Promise<Voluntario>;
  iniciarSesionComoDemo?(): Promise<Voluntario>;
  registrar(datos: CredencialesRegistro): Promise<ResultadoRegistro>;
  registrarOffline?(datos: CredencialesRegistro): Promise<Voluntario>;
  /** Voluntario de la sesión guardada, o null si no hay sesión (o la cuenta no está aprobada). */
  obtenerVoluntarioActual(): Promise<Voluntario | null>;
  cerrarSesion(): Promise<void>;
  actualizarVoluntario(voluntario: Voluntario): Promise<Voluntario>;
  recuperarClave(email: string): Promise<boolean>;
  cambiarClave(nuevaClave: string): Promise<void>;

  /** Métodos de coordinación y administración de voluntarios */
  obtenerVoluntariosPendientes?(): Promise<SolicitudVoluntarioPendiente[]>;
  aprobarVoluntario?(userId: string, token?: string): Promise<ResultadoAccionSolicitud>;
  rechazarVoluntario?(userId: string, token?: string): Promise<ResultadoAccionSolicitud>;
}

