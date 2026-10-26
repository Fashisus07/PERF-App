import { Clinica, SolicitudTurno, Turno } from '../../domain/models/Turno';
import { TurnoRepository } from '../../domain/repositories/TurnoRepository';
import { getDatabase } from '../local/Database';
import { generarUUID } from '../local/uuid';
import { turnoFromRow, turnoToParams, TurnoRow } from '../mappers/CasoMapper';
import { clinicasMock, reservasDeOtrasGuardias, turnosIniciales } from '../mock/turnosMock';

export class TurnoRepositoryImpl implements TurnoRepository {
  private seeded = false;

  private async asegurarSemilla(): Promise<void> {
    if (this.seeded) return;
    const db = await getDatabase();
    const countResult = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM turnos;'
    );
    if (!countResult || countResult.count === 0) {
      const iniciales = turnosIniciales();
      for (const t of iniciales) {
        await db.runAsync(
          `INSERT INTO turnos (
            id, caso_id, centro_veterinario_id, fecha_hora, motivo,
            recordatorio_minutos, cumplido, sync_status, updated_at
          ) VALUES ($id, $caso_id, $centro_veterinario_id, $fecha_hora, $motivo, $recordatorio_minutos, $cumplido, $sync_status, $updated_at);`,
          turnoToParams(t)
        );
      }
    }
    this.seeded = true;
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
    return clinicasMock;
  }

  async horariosOcupados(clinicaId: string): Promise<Date[]> {
    const turnos = await this.obtenerTurnos();
    const otras = reservasDeOtrasGuardias();
    const ocupadosTurnos = turnos
      .filter((t) => t.centroVeterinarioId === clinicaId)
      .map((t) => new Date(t.fechaHora));
    const ocupadasOtras = otras
      .filter((o) => o.clinicaId === clinicaId)
      .map((o) => o.fecha);

    return [...ocupadosTurnos, ...ocupadasOtras];
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
      syncStatus: 'PENDING',
      updatedAt: ahora,
    };

    await db.runAsync(
      `INSERT INTO turnos (
        id, caso_id, centro_veterinario_id, fecha_hora, motivo,
        recordatorio_minutos, cumplido, sync_status, updated_at
      ) VALUES ($id, $caso_id, $centro_veterinario_id, $fecha_hora, $motivo, $recordatorio_minutos, $cumplido, $sync_status, $updated_at);`,
      turnoToParams(turno)
    );

    // Encolar historial en el caso
    await db.runAsync(
      `INSERT INTO eventos_historial (id, caso_id, tipo, fecha, descripcion, sync_status)
       VALUES (?, ?, 'VISITA_VETERINARIA', ?, ?, 'PENDING');`,
      [generarUUID(), turno.casoId, turno.fechaHora, `Turno agendado: ${turno.motivo}`]
    );

    // Encolar en cola de sincronización offline
    await db.runAsync(
      `INSERT INTO operaciones_pendientes (entidad, operacion, payload, reintentos, created_at)
       VALUES (?, ?, ?, 0, ?);`,
      ['TURNO', 'CREATE', JSON.stringify(turno), ahora]
    );

    return turno;
  }

  async marcarCumplido(turnoId: string): Promise<Turno> {
    const db = await getDatabase();
    const ahora = Date.now();
    await db.runAsync(
      `UPDATE turnos SET cumplido = 1, sync_status = 'PENDING', updated_at = ? WHERE id = ?;`,
      [ahora, turnoId]
    );

    await db.runAsync(
      `INSERT INTO operaciones_pendientes (entidad, operacion, payload, reintentos, created_at)
       VALUES (?, ?, ?, 0, ?);`,
      ['TURNO', 'UPDATE', JSON.stringify({ id: turnoId, cumplido: true }), ahora]
    );

    const row = await db.getFirstAsync<TurnoRow>('SELECT * FROM turnos WHERE id = ?;', [turnoId]);
    if (!row) throw new Error('Turno no encontrado');
    return turnoFromRow(row);
  }

  async cancelar(turnoId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM turnos WHERE id = ?;`, [turnoId]);

    await db.runAsync(
      `INSERT INTO operaciones_pendientes (entidad, operacion, payload, reintentos, created_at)
       VALUES (?, ?, ?, 0, ?);`,
      ['TURNO', 'DELETE', JSON.stringify({ id: turnoId }), Date.now()]
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
