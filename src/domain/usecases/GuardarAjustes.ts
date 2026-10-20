import { Ajustes, UMBRAL_MAX, UMBRAL_MIN } from '../models/Ajustes';
import { AjustesRepository } from '../repositories/AjustesRepository';

export class ObtenerAjustes {
  constructor(private readonly repo: AjustesRepository) {}
  ejecutar() {
    return this.repo.obtener();
  }
}

export class GuardarAjustes {
  constructor(private readonly repo: AjustesRepository) {}

  async ejecutar(ajustes: Ajustes): Promise<Ajustes> {
    const umbral = Math.round(ajustes.umbralUrgenteDias);
    if (umbral < UMBRAL_MIN || umbral > UMBRAL_MAX) {
      throw new Error(`El umbral debe estar entre ${UMBRAL_MIN} y ${UMBRAL_MAX} días`);
    }
    const limpios = { ...ajustes, umbralUrgenteDias: umbral };
    await this.repo.guardar(limpios);
    return limpios;
  }
}
