/**
 * Cliente para sincronización con el backend remoto de PERF.
 * Prepara la arquitectura para conectarse con APIs REST, Supabase o GraphQL.
 */

export interface OperacionRemota {
  id?: number;
  entidad: string;
  operacion: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
}

export interface RespuestaSyncRemota {
  exito: boolean;
  operacionesProcesadas: number;
  errores?: string[];
}

export interface RemoteApiClient {
  sincronizarOperaciones(operaciones: OperacionRemota[]): Promise<RespuestaSyncRemota>;
  verificarConectividad(): Promise<boolean>;
}
