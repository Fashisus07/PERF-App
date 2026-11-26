import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'perf.web_sqlite_tables_v1';

export class WebDatabase {
  private tables: Record<string, any[]> = {};
  private loaded = false;

  private async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        this.tables = JSON.parse(data);
      }
    } catch {}
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.tables));
    } catch {}
  }

  private ensureTable(name: string): any[] {
    const key = name.toLowerCase().trim();
    if (!this.tables[key]) {
      this.tables[key] = [];
    }
    return this.tables[key];
  }

  async execAsync(sql: string): Promise<void> {
    await this.load();
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      const createMatch = stmt.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?([a-zA-Z0-9_]+)/i);
      if (createMatch) {
        this.ensureTable(createMatch[1]);
      }
    }
    await this.persist();
  }

  async runAsync(sql: string, params?: any[] | Record<string, any>): Promise<{ lastInsertRowId: number; changes: number }> {
    await this.load();
    const cleanSql = sql.trim();

    // 1. INSERT INTO
    const insertMatch = cleanSql.match(/insert\s+into\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*values/i);
    if (insertMatch) {
      const tableName = insertMatch[1].toLowerCase().trim();
      const cols = insertMatch[2].split(',').map((c) => c.trim());
      const table = this.ensureTable(tableName);

      const row: Record<string, any> = {};
      if (Array.isArray(params)) {
        cols.forEach((col, idx) => {
          row[col] = params[idx] !== undefined ? params[idx] : null;
        });
      } else if (params && typeof params === 'object') {
        cols.forEach((col) => {
          row[col] =
            params[`$${col}`] !== undefined
              ? params[`$${col}`]
              : params[col] !== undefined
              ? params[col]
              : null;
        });
      }

      const existingIdx =
        (cleanSql.toLowerCase().includes('on conflict') || cleanSql.toLowerCase().includes('or ignore')) && row.id
          ? table.findIndex((r) => r.id === row.id)
          : -1;
      if (existingIdx >= 0) {
        if (!cleanSql.toLowerCase().includes('or ignore')) {
          table[existingIdx] = { ...table[existingIdx], ...row };
        }
      } else {
        table.push(row);
      }
      await this.persist();
      return { lastInsertRowId: table.length, changes: 1 };
    }

    // 2. UPDATE
    const updateMatch = cleanSql.match(/update\s+([a-zA-Z0-9_]+)\s+set\s+([\s\S]+?)(?:\s+where\s+([\s\S]+?))?(?:;|$)/i);
    if (updateMatch) {
      const tableName = updateMatch[1].toLowerCase().trim();
      const setClause = updateMatch[2].trim();
      const whereClause = updateMatch[3]?.trim();
      const table = this.ensureTable(tableName);

      let setParams: any[] | Record<string, any> | undefined = params;
      let whereParams: any[] | Record<string, any> | undefined = params;

      if (Array.isArray(params)) {
        const numSetPlaceholders = (setClause.match(/\?/g) || []).length;
        setParams = params.slice(0, numSetPlaceholders);
        whereParams = params.slice(numSetPlaceholders);
      }

      let changes = 0;
      for (const row of table) {
        if (!whereClause || this.evalWhere(row, whereClause, whereParams)) {
          this.applySet(row, setClause, setParams);
          changes++;
        }
      }

      await this.persist();
      return { lastInsertRowId: 0, changes };
    }

    // 3. DELETE
    const deleteMatch = cleanSql.match(/delete\s+from\s+([a-zA-Z0-9_]+)(?:\s+where\s+([\s\S]+))?/i);
    if (deleteMatch) {
      const tableName = deleteMatch[1].toLowerCase().trim();
      const whereClause = deleteMatch[2]?.trim();
      const table = this.ensureTable(tableName);

      const initialLen = table.length;
      if (!whereClause) {
        this.tables[tableName] = [];
      } else {
        this.tables[tableName] = table.filter((row) => !this.evalWhere(row, whereClause, params));
      }

      await this.persist();
      return { lastInsertRowId: 0, changes: initialLen - this.tables[tableName].length };
    }

    return { lastInsertRowId: 0, changes: 0 };
  }

  async getAllAsync<T>(sql: string, params?: any[] | Record<string, any>): Promise<T[]> {
    await this.load();
    const cleanSql = sql.trim();

    // COUNT query
    const countMatch = cleanSql.match(/select\s+count\(\*\)\s*(?:as\s+count)?\s+from\s+([a-zA-Z0-9_]+)/i);
    if (countMatch) {
      const tableName = countMatch[1].toLowerCase().trim();
      const count = this.tables[tableName]?.length ?? 0;
      return [{ count }] as unknown as T[];
    }

    // Consulta especial con subconsulta de ultima_revision (SQL_CASO_CON_REVISION)
    const conRevisionMatch = cleanSql.match(
      /^select\s+c\.\*,\s*\([\s\S]+?\)\s+as\s+ultima_revision\s+from\s+casos\s+c(?:\s+where\s+([\s\S]+?))?(?:\s+order\s+by\s+([\s\S]+?))?(?:;|$)/i
    );
    if (conRevisionMatch) {
      const whereClause = conRevisionMatch[1]?.trim();
      const orderByClause = conRevisionMatch[2]?.trim();
      const casos = this.ensureTable('casos');
      const eventos = this.ensureTable('eventos_historial');
      const excluidos = new Set(['CAMBIO_TRANSITO', 'ADOPCION']);

      let results = casos
        .filter((row) => this.evalWhere(row, whereClause, params))
        .map((r) => {
          let maxFecha: number | null = null;
          for (const ev of eventos) {
            if (ev.caso_id === r.id && !excluidos.has(ev.tipo)) {
              if (maxFecha === null || Number(ev.fecha) > maxFecha) {
                maxFecha = Number(ev.fecha);
              }
            }
          }
          return { ...r, ultima_revision: maxFecha };
        });

      if (orderByClause) {
        results = this.applyOrderBy(results, orderByClause);
      }
      return results as unknown as T[];
    }

    // SELECT query
    const selectMatch = cleanSql.match(/select\s+([\s\S]+?)\s+from\s+([a-zA-Z0-9_]+)(?:\s+where\s+([\s\S]+?))?(?:\s+order\s+by\s+([\s\S]+?))?(?:;|$)/i);
    if (!selectMatch) {
      return [];
    }

    const fieldsStr = selectMatch[1].trim();
    const tableName = selectMatch[2].toLowerCase().trim();
    const whereClause = selectMatch[3]?.trim();
    const orderByClause = selectMatch[4]?.trim();

    const table = this.ensureTable(tableName);
    let results = table.filter((row) => this.evalWhere(row, whereClause, params));

    if (orderByClause) {
      results = this.applyOrderBy(results, orderByClause);
    }

    if (fieldsStr !== '*' && fieldsStr !== 'id') {
      // Return full or mapped
      return results.map((r) => ({ ...r })) as unknown as T[];
    }

    if (fieldsStr === 'id') {
      return results.map((r) => ({ id: r.id })) as unknown as T[];
    }

    return results.map((r) => ({ ...r })) as unknown as T[];
  }

  async getFirstAsync<T>(sql: string, params?: any[] | Record<string, any>): Promise<T | null> {
    const list = await this.getAllAsync<T>(sql, params);
    return list.length > 0 ? list[0] : null;
  }

  async closeAsync(): Promise<void> {
    // No-op en web
  }

  private evalWhere(row: any, whereClause?: string, params?: any[] | Record<string, any>): boolean {
    if (!whereClause) return true;
    const clause = whereClause.trim();

    // 1. c.estado_caso / estado_caso NOT IN (...)
    if (/(?:c\.)?estado_caso\s+not\s+in/i.test(clause)) {
      return row.estado_caso !== 'ADOPTADO' && row.estado_caso !== 'FALLECIDO';
    }

    // 2. c.estado_caso / estado_caso IN (...)
    if (/(?:c\.)?estado_caso\s+in/i.test(clause)) {
      return row.estado_caso === 'ADOPTADO' || row.estado_caso === 'FALLECIDO';
    }

    // 3. LOWER(email) = ? OR LOWER(nombre) = ?
    if (/lower\(email\)\s*=\s*\?\s*or\s*lower\(nombre\)\s*=\s*\?/i.test(clause)) {
      const p = Array.isArray(params) ? params : [];
      const val1 = String(p[0] ?? '').toLowerCase();
      const val2 = String(p[1] ?? '').toLowerCase();
      const rEmail = String(row.email ?? '').toLowerCase();
      const rNombre = String(row.nombre ?? '').toLowerCase();
      return rEmail === val1 || rNombre === val2;
    }

    // 4. LOWER(email) = ?
    if (/lower\(email\)\s*=\s*\?/i.test(clause)) {
      const p = Array.isArray(params) ? params : [];
      const val = String(p[0] ?? '').toLowerCase();
      return String(row.email ?? '').toLowerCase() === val;
    }

    // 5. id NOT IN (...) (e.g. DELETE FROM centros_veterinarios WHERE id NOT IN (...))
    if (/^id\s+not\s+in/i.test(clause)) {
      const ids = Array.isArray(params) ? params.map(String) : [];
      return !ids.includes(String(row.id));
    }

    // 5b. id LIKE ?
    if (/^id\s+like\s+\?/i.test(clause)) {
      const patron = String(Array.isArray(params) ? params[0] ?? '' : '').toLowerCase();
      const val = String(row.id ?? '').toLowerCase();
      if (patron.endsWith('%')) return val.startsWith(patron.slice(0, -1));
      return val === patron;
    }

    // 6. c.id = ? / id = ? / id = $id
    if (/^(?:c\.)?id\s*=\s*(\?|\$id)/i.test(clause)) {
      const targetId = Array.isArray(params) ? params[0] : (params as any)?.$id ?? (params as any)?.id;
      return String(row.id) === String(targetId);
    }

    // 7. caso_id = ? AND test_id = ?
    if (/^caso_id\s*=\s*\?\s+and\s+test_id\s*=\s*\?/i.test(clause)) {
      const p = Array.isArray(params) ? params : [];
      return String(row.caso_id) === String(p[0]) && String(row.test_id) === String(p[1]);
    }

    // 8. caso_id = ?
    if (/^caso_id\s*=\s*\?/i.test(clause)) {
      const targetId = Array.isArray(params) ? params[0] : (params as any)?.caso_id;
      return String(row.caso_id) === String(targetId);
    }

    // 8b. caso_origen_id = ? OR caso_destino_id = ?
    if (/^caso_origen_id\s*=\s*\?\s+or\s+caso_destino_id\s*=\s*\?/i.test(clause)) {
      const p = Array.isArray(params) ? params : [];
      return String(row.caso_origen_id) === String(p[0]) || String(row.caso_destino_id) === String(p[1]);
    }

    // 8c. caso_origen_id = ?
    if (/^caso_origen_id\s*=\s*\?/i.test(clause)) {
      const targetId = Array.isArray(params) ? params[0] : (params as any)?.caso_origen_id;
      return String(row.caso_origen_id) === String(targetId);
    }

    // 8d. caso_destino_id = ?
    if (/^caso_destino_id\s*=\s*\?/i.test(clause)) {
      const targetId = Array.isArray(params) ? params[0] : (params as any)?.caso_destino_id;
      return String(row.caso_destino_id) === String(targetId);
    }

    // 9. entidad = ?
    if (/^entidad\s*=\s*'([^']*)'/i.test(clause)) {
      const m = clause.match(/^entidad\s*=\s*'([^']*)'/i);
      return m ? String(row.entidad) === m[1] : true;
    }

    // 10. activo = 1
    if (/^activo\s*=\s*1/i.test(clause)) {
      return Number(row.activo) === 1;
    }

    return true;
  }

  private applySet(row: any, setClause: string, params?: any[] | Record<string, any>): void {
    const parts = setClause.split(',').map((p) => p.trim());
    let paramIndex = 0;

    for (const part of parts) {
      const eqMatch = part.match(/([a-zA-Z0-9_]+)\s*=\s*([\s\S]+)/);
      if (!eqMatch) continue;
      const col = eqMatch[1].trim();
      const valExpr = eqMatch[2].trim();

      if (valExpr === '?') {
        if (Array.isArray(params)) {
          row[col] = params[paramIndex++];
        }
      } else if (valExpr.startsWith('$')) {
        const paramKey = valExpr;
        if (params && typeof params === 'object') {
          row[col] = (params as any)[paramKey];
        }
      } else if (valExpr === '1') {
        row[col] = 1;
      } else if (valExpr === '0') {
        row[col] = 0;
      } else if (/^'([^']*)'$/.test(valExpr)) {
        row[col] = valExpr.slice(1, -1);
      } else if (/^reintentos\s*\+\s*1$/i.test(valExpr)) {
        row[col] = (Number(row[col]) || 0) + 1;
      }
    }
  }

  private applyOrderBy(list: any[], orderBy: string): any[] {
    const parts = orderBy.split(',').map((p) => p.trim());
    return [...list].sort((a, b) => {
      for (const p of parts) {
        const [rawField, direction] = p.split(/\s+/);
        const field = rawField.replace(/^[a-z0-9_]+\./i, '');
        const desc = direction?.toUpperCase() === 'DESC';
        const valA = a[field] ?? '';
        const valB = b[field] ?? '';
        if (valA < valB) return desc ? 1 : -1;
        if (valA > valB) return desc ? -1 : 1;
      }
      return 0;
    });
  }
}

let _webDb: WebDatabase | null = null;
export function getWebDatabase(): WebDatabase {
  if (!_webDb) {
    _webDb = new WebDatabase();
  }
  return _webDb;
}
