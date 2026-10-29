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

export class MockRemoteApiClient implements RemoteApiClient {
  constructor(private readonly endpoint: string = 'https://api.perfelino.org/v1/sync') {}

  async verificarConectividad(): Promise<boolean> {
    // Simula ping al servidor
    await new Promise((resolve) => setTimeout(resolve, 300));
    return true;
  }

  async sincronizarOperaciones(operaciones: OperacionRemota[]): Promise<RespuestaSyncRemota> {
    if (operaciones.length === 0) {
      return { exito: true, operacionesProcesadas: 0 };
    }

    // Simula latencia de red en terreno (800ms)
    await new Promise((resolve) => setTimeout(resolve, 800));

    // En una implementación real enviaría un POST con el batch de operaciones
    return {
      exito: true,
      operacionesProcesadas: operaciones.length,
    };
  }
}
