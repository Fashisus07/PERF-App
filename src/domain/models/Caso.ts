export type Urgencia = 'urgente' | 'atencion' | 'aldia';

export type Caso = {
  id: string;
  nombre: string;
  descripcion: string; // especie / edad aproximada
  urgencia: Urgencia;
  diasEnEspera: number;
  estado: string;
  ubicacion: string;
  ubicacionTipo: 'calle' | 'veterinaria';
  foto: number; // resultado de require() de una imagen local
  pendienteSync: boolean;
};
