import { casosMock, IDS_CASOS_MOCK_ANTERIORES } from '../casosMock';
import { turnosIniciales } from '../turnosMock';

describe('Conjunto inicial de 20 casos completos y turnos asociados', () => {
  test('Contiene exactamente 20 casos nuevos con todos los campos completos y UUID válido', () => {
    expect(casosMock).toHaveLength(20);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const ids = new Set<string>();

    for (const c of casosMock) {
      expect(IDS_CASOS_MOCK_ANTERIORES).not.toContain(c.id);
      expect(uuidRegex.test(c.id)).toBe(true);
      expect(ids.has(c.id)).toBe(false);
      ids.add(c.id);

      expect(c.nombreProvisorio.trim().length).toBeGreaterThan(0);
      expect(c.edadEstimada.trim().length).toBeGreaterThan(0);
      expect(c.historiaOrigen.trim().length).toBeGreaterThan(0);
      expect(c.personalidad.trim().length).toBeGreaterThan(0);
      expect(c.estadoVisible.trim().length).toBeGreaterThan(0);
      expect(c.barrio.trim().length).toBeGreaterThan(0);
      expect(c.coordenadas).not.toBeNull();
      expect(c.quienSigueCaso.trim().length).toBeGreaterThan(0);
      expect(c.transito.nombre.trim().length).toBeGreaterThan(0);
      expect(c.transito.telefono.trim().length).toBeGreaterThan(0);
      expect(c.transito.correo?.trim().length).toBeGreaterThan(0);
      expect(c.sanidad.castrado).toBeDefined();
      expect(c.sanidad.virales).toBeDefined();
      expect(c.motivoUrgencia.trim().length).toBeGreaterThan(0);
    }
  });

  test('Todos los turnos iniciales referencian casos válidos del conjunto de 20 casos', () => {
    const idsCasos = new Set(casosMock.map((c) => c.id));
    const turnos = turnosIniciales();

    expect(turnos.length).toBeGreaterThanOrEqual(4);
    for (const t of turnos) {
      expect(idsCasos.has(t.casoId)).toBe(true);
      expect(t.motivo.trim().length).toBeGreaterThan(0);
    }
  });
});
