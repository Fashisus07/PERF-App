import { Voluntario } from '../models/Ajustes';

export interface CredencialesRegistro {
  nombre: string;
  email: string;
  telefono: string;
  clave: string;
  zona: string;
  recursos?: string[];
}

export interface AuthRepository {
  iniciarSesion(usuarioOEmail: string, clave: string, recordar?: boolean): Promise<Voluntario>;
  registrar(datos: CredencialesRegistro): Promise<Voluntario>;
  obtenerVoluntarioActual(): Promise<Voluntario | null>;
  cerrarSesion(): Promise<void>;
  guardarSesion(voluntario: Voluntario, recordar?: boolean): Promise<void>;
  actualizarVoluntario(voluntario: Voluntario): Promise<Voluntario>;
  recuperarClave(email: string): Promise<boolean>;
}
