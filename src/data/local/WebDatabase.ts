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

      table.push(row);
      await this.persist();
      return { lastInsertRowId: table.length, changes: 1 };
    }

    // 2. UPDATE
    const updateMatch = cleanSql.match(/update\s+([a-zA-Z0-9_]+)\s+set\s+([\s\S]+?)\s+where\s+([\s\S]+)/i);
    if (updateMatch) {
      const tableName = updateMatch[1].toLowerCase().trim();
      const setClause = updateMatch[2].trim();
      const whereClause = updateMatch[3].trim();
      const table = this.ensureTable(tableName);

      let changes = 0;
      for (const row of table) {
        if (this.evalWhere(row, whereClause, params)) {
          this.applySet(row, setClause, params);
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

    // 1. estado_caso NOT IN ('ADOPTADO', 'FALLECIDO')
    if (/estado_caso\s+not\s+in/i.test(clause)) {
      return row.estado_caso !== 'ADOPTADO' && row.estado_caso !== 'FALLECIDO';
    }

    // 2. estado_caso IN ('ADOPTADO', 'FALLECIDO')
    if (/estado_caso\s+in/i.test(clause)) {
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

    // 5. id = ? or id = $id
    if (/^id\s*=\s*(\?|\$id)/i.test(clause)) {
      const targetId = Array.isArray(params) ? params[0] : (params as any)?.$id ?? (params as any)?.id;
      return String(row.id) === String(targetId);
    }

    // 6. caso_id = ?
    if (/^caso_id\s*=\s*\?/i.test(clause)) {
      const targetId = Array.isArray(params) ? params[0] : (params as any)?.caso_id;
      return String(row.caso_id) === String(targetId);
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
        const [field, direction] = p.split(/\s+/);
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
