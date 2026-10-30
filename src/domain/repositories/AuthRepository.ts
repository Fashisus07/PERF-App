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

export interface AuthRepository {
  /** Falla si las credenciales son incorrectas o la cuenta todavía no fue aprobada. */
  iniciarSesion(usuarioOEmail: string, clave: string): Promise<Voluntario>;
  registrar(datos: CredencialesRegistro): Promise<ResultadoRegistro>;
  /** Voluntario de la sesión guardada, o null si no hay sesión (o la cuenta no está aprobada). */
  obtenerVoluntarioActual(): Promise<Voluntario | null>;
  cerrarSesion(): Promise<void>;
  actualizarVoluntario(voluntario: Voluntario): Promise<Voluntario>;
  recuperarClave(email: string): Promise<boolean>;
}
