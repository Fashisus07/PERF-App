import * as Notifications from 'expo-notifications';
import { Clinica, SolicitudTurno, Turno } from '../../domain/models/Turno';
import { TurnoRepository } from '../../domain/repositories/TurnoRepository';
import { getDatabase } from '../local/Database';
import { esModoDemo, purgarDatosDemoDeDb } from '../local/ModoDemo';
import { generarUUID } from '../local/uuid';
import { turnoFromRow, turnoToParams, TurnoRow } from '../mappers/CasoMapper';
import {
  clinicasMock,
  IDS_TURNOS_MOCK_ANTERIORES,
  turnosIniciales,
} from '../mock/turnosMock';

export class TurnoRepositoryImpl implements TurnoRepository {
  private seededDemo = false;
  private siembra: Promise<void> | null = null;

  // En modo real no sembramos datos de ejemplo; en Modo Demo poblamos una sola vez.
  private async asegurarSemilla(): Promise<void> {
    const demo = await esModoDemo();
    if (!demo) {
      if (this.seededDemo) {
        const db = await getDatabase();
        await purgarDatosDemoDeDb(
          db as any,
          [],
          clinicasMock.map((c) => c.id)
        );
        this.seededDemo = false;
      }
      return;
    }
    if (this.seededDemo) return;
    this.siembra ??= this.sembrarDemo().catch((e) => {
      this.siembra = null;
      throw e;
    });
    return this.siembra;
  }

  private async sembrarDemo(): Promise<void> {
    const db = await getDatabase();

    // Poblar centros veterinarios de ejemplo si no existen en Modo Demo
    const centrosCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM centros_veterinarios;'
    );
    if (!centrosCount || centrosCount.count === 0) {
      for (const c of clinicasMock) {
        await db.runAsync(
          `INSERT OR IGNORE INTO centros_veterinarios (
            id, nombre, medico, barrio, direccion, telefono, detalle, distancia, abierto, tipo, horarios, dias_atencion
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            c.id,
            c.nombre,
            c.medico ?? null,
            c.barrio,
            c.direccion,
            c.telefono,
            c.detalle ?? null,
            c.distancia ?? null,
            c.abierto ? 1 : 0,
            c.tipo,
            JSON.stringify(c.horarios ?? ['09:00', '10:30', '11:15', '12:15', '16:00', '18:30']),
            c.diasAtencion?.length ? JSON.stringify(c.diasAtencion) : null,
          ]
        );
      }
    }

    const countResult = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM turnos;'
    );
    if (!countResult || countResult.count === 0) {
      for (const oldTurnoId of IDS_TURNOS_MOCK_ANTERIORES) {
        await db.runAsync('DELETE FROM turnos WHERE id = ?;', [oldTurnoId]);
      }
      const iniciales = turnosIniciales();
      for (const t of iniciales) {
        const existe = await db.getFirstAsync<{ id: string }>(
          'SELECT id FROM turnos WHERE id = ?;',
          [t.id]
        );
        if (existe) continue;
        await db.runAsync(
          `INSERT INTO turnos (
            id, caso_id, centro_veterinario_id, fecha_hora, motivo,
            recordatorio_minutos, cumplido, notification_id, sync_status, updated_at
          ) VALUES ($id, $caso_id, $centro_veterinario_id, $fecha_hora, $motivo, $recordatorio_minutos, $cumplido, $notification_id, $sync_status, $updated_at);`,
          turnoToParams(t)
        );
      }
    }
    this.seededDemo = true;
  }

  async obtenerTurnos(): Promise<Turno[]> {
    await this.asegurarSemilla();
    const db = await getDatabase();
    const rows = await db.getAllAsync<TurnoRow>(
      `SELECT * FROM turnos ORDER BY fecha_hora ASC;`
    );
    return rows.map(turnoFromRow);
  }

  async obtenerPorCasoId(casoId: string): Promise<Turno[]> {
    await this.asegurarSemilla();
    const db = await getDatabase();
    const rows = await db.getAllAsync<TurnoRow>(
      `SELECT * FROM turnos WHERE caso_id = ? ORDER BY fecha_hora ASC;`,
      [casoId]
    );
    return rows.map(turnoFromRow);
  }

  async obtenerClinicas(): Promise<Clinica[]> {
    await this.asegurarSemilla();
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: string;
      nombre: string;
      medico: string | null;
      barrio: string;
      direccion: string;
      telefono: string;
      detalle: string | null;
      distancia: string | null;
      abierto: number;
      tipo: 'consultorio' | 'hospital' | 'quirurgico';
      horarios: string;
      dias_atencion?: string | null;
    }>('SELECT * FROM centros_veterinarios ORDER BY nombre ASC;');

    if (rows.length === 0) return [];

    return rows.map((r) => {
      let diasAtencion: Clinica['diasAtencion'];
      if (r.dias_atencion) {
        try {
          const parsed = Array.isArray(r.dias_atencion) ? r.dias_atencion : JSON.parse(r.dias_atencion);
          if (Array.isArray(parsed) && parsed.length) diasAtencion = parsed;
        } catch {}
      }
      return {
        id: r.id,
        nombre: r.nombre,
        medico: r.medico || undefined,
        barrio: r.barrio,
        direccion: r.direccion,
        telefono: r.telefono,
        detalle: r.detalle || undefined,
        distancia: r.distancia || undefined,
        abierto: Boolean(r.abierto),
        tipo: r.tipo,
        horarios: r.horarios ? JSON.parse(r.horarios) : undefined,
        diasAtencion,
      };
    });
  }

  async horariosOcupados(clinicaId: string): Promise<Date[]> {
    const turnos = await this.obtenerTurnos();
    return turnos
      .filter((t) => t.centroVeterinarioId === clinicaId)
      .map((t) => new Date(t.fechaHora));
  }

  async agregar(solicitud: SolicitudTurno, titulo?: string): Promise<Turno> {
    const db = await getDatabase();
    const ahora = Date.now();
    const clinicaId = solicitud.centroVeterinarioId || (solicitud as any).clinicaId;
    const ts = typeof solicitud.fechaHora === 'number'
      ? solicitud.fechaHora
      : ((solicitud as any).fecha ? (solicitud as any).fecha.getTime() : ahora);

    const turno: Turno = {
      id: generarUUID(),
      casoId: solicitud.casoId,
      centroVeterinarioId: clinicaId,
      fechaHora: ts,
      motivo: titulo || solicitud.motivo,
      recordatorioMinutos: solicitud.recordatorioMinutos || 120,
      cumplido: false,
      notificationId: null,
      syncStatus: 'PENDING',
      updatedAt: ahora,
    };

    await db.runAsync(
      `INSERT INTO turnos (
        id, caso_id, centro_veterinario_id, fecha_hora, motivo,
        recordatorio_minutos, cumplido, notification_id, sync_status, updated_at
      ) VALUES ($id, $caso_id, $centro_veterinario_id, $fecha_hora, $motivo, $recordatorio_minutos, $cumplido, $notification_id, $sync_status, $updated_at);`,
      turnoToParams(turno)
    );

    // Encolar historial en el caso
    await db.runAsync(
      `INSERT INTO eventos_historial (id, caso_id, tipo, fecha, descripcion, sync_status)
       VALUES (?, ?, 'VISITA_VETERINARIA', ?, ?, 'PENDING');`,
      [generarUUID(), turno.casoId, turno.fechaHora, `Turno agendado: ${turno.motivo}`]
    );

    // Encolar en cola de sincronización offline con idempotency_key
    const idempotencyKey = generarUUID();
    await db.runAsync(
      `INSERT INTO operaciones_pendientes (idempotency_key, entidad, operacion, payload, reintentos, created_at)
       VALUES (?, ?, ?, ?, 0, ?);`,
      [idempotencyKey, 'TURNO', 'CREATE', JSON.stringify(turno), ahora]
    );

    return turno;
  }

  async marcarCumplido(turnoId: string): Promise<Turno> {
    const db = await getDatabase();
    const ahora = Date.now();

    const previo = await db.getFirstAsync<TurnoRow>('SELECT * FROM turnos WHERE id = ?;', [turnoId]);
    if (previo?.notification_id) {
      try {
        await Notifications.cancelScheduledNotificationAsync(previo.notification_id).catch(() => {});
      } catch {}
    }

    await db.runAsync(
      `UPDATE turnos SET cumplido = 1, sync_status = 'PENDING', updated_at = ? WHERE id = ?;`,
      [ahora, turnoId]
    );

    const idempotencyKey = generarUUID();
    await db.runAsync(
      `INSERT INTO operaciones_pendientes (idempotency_key, entidad, operacion, payload, reintentos, created_at)
       VALUES (?, ?, ?, ?, 0, ?);`,
      [idempotencyKey, 'TURNO', 'UPDATE', JSON.stringify({ id: turnoId, cumplido: true, updated_at: ahora }), ahora]
    );

    const row = await db.getFirstAsync<TurnoRow>('SELECT * FROM turnos WHERE id = ?;', [turnoId]);
    if (!row) throw new Error('Turno no encontrado');
    return turnoFromRow(row);
  }

  async cancelar(turnoId: string): Promise<void> {
    const db = await getDatabase();
    const previo = await db.getFirstAsync<TurnoRow>('SELECT * FROM turnos WHERE id = ?;', [turnoId]);
    if (previo?.notification_id) {
      try {
        await Notifications.cancelScheduledNotificationAsync(previo.notification_id).catch(() => {});
      } catch {}
    }

    await db.runAsync(`DELETE FROM turnos WHERE id = ?;`, [turnoId]);

    const idempotencyKey = generarUUID();
    await db.runAsync(
      `INSERT INTO operaciones_pendientes (idempotency_key, entidad, operacion, payload, reintentos, created_at)
       VALUES (?, ?, ?, ?, 0, ?);`,
      [idempotencyKey, 'TURNO', 'DELETE', JSON.stringify({ id: turnoId }), Date.now()]
    );
  }

  async sincronizar(): Promise<number> {
    const db = await getDatabase();
    const pendientes = await db.getAllAsync<{ id: number; entidad: string; payload: string }>(
      `SELECT * FROM operaciones_pendientes WHERE entidad = 'TURNO';`
    );
    if (pendientes.length === 0) return 0;
    await db.runAsync(`UPDATE turnos SET sync_status = 'SYNCED';`);
    await db.runAsync(`DELETE FROM operaciones_pendientes WHERE entidad = 'TURNO';`);
    return pendientes.length;
  }
}
