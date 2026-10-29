import AsyncStorage from '@react-native-async-storage/async-storage';
import { Voluntario } from '../../domain/models/Ajustes';
import { AuthRepository, CredencialesRegistro } from '../../domain/repositories/AuthRepository';
import { getDatabase } from './Database';
import { generarUUID } from './uuid';

const CLAVE_SESION = 'perf.sesion_voluntario';
const CLAVE_RECORDAR = 'perf.recordar_usuario';

interface VoluntarioRow {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  brigada: string;
  zona: string;
  clave: string;
  recursos: string | null;
  created_at: number;
}

export const VOLUNTARIO_DEMO: Voluntario = {
  id: 'voluntario-1',
  nombre: 'Mariana Gomez',
  brigada: 'Brigada Caballito',
  email: 'mariana@perfelino.org',
  telefono: '1154320000',
  zona: 'Caballito',
  recursos: ['canil', 'transito'],
};

export class AuthRepositoryImpl implements AuthRepository {
  private seeded = false;

  private async asegurarSemilla(): Promise<void> {
    if (this.seeded) return;
    const db = await getDatabase();
    const count = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM voluntarios;'
    );
    if (!count || count.count === 0) {
      await db.runAsync(
        `INSERT INTO voluntarios (
          id, nombre, email, telefono, brigada, zona, clave, recursos, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          VOLUNTARIO_DEMO.id!,
          VOLUNTARIO_DEMO.nombre,
          VOLUNTARIO_DEMO.email!,
          VOLUNTARIO_DEMO.telefono!,
          VOLUNTARIO_DEMO.brigada,
          VOLUNTARIO_DEMO.zona!,
          'guardia123',
          JSON.stringify(VOLUNTARIO_DEMO.recursos ?? []),
          Date.now(),
        ]
      );
    }
    this.seeded = true;
  }

  async iniciarSesion(usuarioOEmail: string, clave: string, recordar = true): Promise<Voluntario> {
    await this.asegurarSemilla();
    const db = await getDatabase();
    const cleanUser = usuarioOEmail.trim().toLowerCase();
    const cleanClave = clave.trim();

    if (!cleanUser || !cleanClave) {
      throw new Error('Por favor, ingresá usuario y contraseña.');
    }

    // Busca por email, nombre o usuario genérico
    const row = await db.getFirstAsync<VoluntarioRow>(
      `SELECT * FROM voluntarios WHERE LOWER(email) = ? OR LOWER(nombre) = ?;`,
      [cleanUser, cleanUser]
    );

    // Permite login con credenciales demo o de la base
    const esDemo = (cleanUser === 'voluntario@perfelino.org' || cleanUser === 'mariana@perfelino.org') &&
      (cleanClave === 'guardia123' || cleanClave === '123456');

    if (!row && !esDemo) {
      throw new Error('Credenciales incorrectas. Verificá tu usuario y contraseña.');
    }

    if (row && row.clave !== cleanClave && !esDemo) {
      throw new Error('Contraseña incorrecta. Verificá los datos ingresados.');
    }

    const voluntario: Voluntario = row
      ? {
          id: row.id,
          nombre: row.nombre,
          brigada: row.brigada,
          email: row.email,
          telefono: row.telefono,
          zona: row.zona,
          recursos: row.recursos ? JSON.parse(row.recursos) : [],
        }
      : VOLUNTARIO_DEMO;

    await this.guardarSesion(voluntario, recordar);
    return voluntario;
  }

  async registrar(datos: CredencialesRegistro): Promise<Voluntario> {
    await this.asegurarSemilla();
    const db = await getDatabase();
    const cleanEmail = datos.email.trim().toLowerCase();

    // Validar si ya existe
    const existente = await db.getFirstAsync<VoluntarioRow>(
      'SELECT id FROM voluntarios WHERE LOWER(email) = ?;',
      [cleanEmail]
    );

    if (existente) {
      throw new Error('Ya existe una cuenta registrada con este correo electrónico.');
    }

    const nuevoId = generarUUID();
    const brigada = `Brigada ${datos.zona}`;
    const ahora = Date.now();

    await db.runAsync(
      `INSERT INTO voluntarios (
        id, nombre, email, telefono, brigada, zona, clave, recursos, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        nuevoId,
        datos.nombre.trim(),
        cleanEmail,
        datos.telefono.trim(),
        brigada,
        datos.zona.trim(),
        datos.clave.trim(),
        JSON.stringify(datos.recursos ?? []),
        ahora,
      ]
    );

    const voluntario: Voluntario = {
      id: nuevoId,
      nombre: datos.nombre.trim(),
      brigada,
      email: cleanEmail,
      telefono: datos.telefono.trim(),
      zona: datos.zona.trim(),
      recursos: datos.recursos ?? [],
    };

    await this.guardarSesion(voluntario, true);
    return voluntario;
  }

  async obtenerVoluntarioActual(): Promise<Voluntario | null> {
    try {
      const guardado = await AsyncStorage.getItem(CLAVE_SESION);
      if (guardado) {
        return JSON.parse(guardado);
      }
      return VOLUNTARIO_DEMO;
    } catch {
      return VOLUNTARIO_DEMO;
    }
  }

  async guardarSesion(voluntario: Voluntario, recordar = true): Promise<void> {
    try {
      await AsyncStorage.setItem(CLAVE_SESION, JSON.stringify(voluntario));
      if (recordar && voluntario.email) {
        await AsyncStorage.setItem(CLAVE_RECORDAR, voluntario.email);
      }
    } catch {
      // Manejo silencioso en almacenamiento
    }
  }

  async cerrarSesion(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CLAVE_SESION);
    } catch {
      // Manejo silencioso
    }
  }

  async actualizarVoluntario(voluntario: Voluntario): Promise<Voluntario> {
    await this.asegurarSemilla();
    const db = await getDatabase();
    if (voluntario.id) {
      await db.runAsync(
        `UPDATE voluntarios 
         SET nombre = ?, telefono = ?, zona = ?, brigada = ?, recursos = ?
         WHERE id = ?;`,
        [
          voluntario.nombre,
          voluntario.telefono ?? '',
          voluntario.zona ?? '',
          voluntario.brigada,
          JSON.stringify(voluntario.recursos ?? []),
          voluntario.id,
        ]
      );
    }
    await this.guardarSesion(voluntario, true);
    return voluntario;
  }

  async recuperarClave(email: string): Promise<boolean> {
    await this.asegurarSemilla();
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      throw new Error('Ingresá un correo electrónico válido');
    }
    // Verificamos si existe en la base o simulamos envío
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM voluntarios WHERE LOWER(email) = ?;',
      [clean]
    );
    // Para no dar pistas de enumeración a atacantes y garantizar flujo fluido,
    // retornamos siempre éxito si el email tiene formato válido.
    return true;
  }
}
