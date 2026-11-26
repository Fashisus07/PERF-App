import { etiquetaRelacionParaCaso, RelacionAnimal } from '../Caso';

describe('Relaciones entre animales individuales (parentesco / camada)', () => {
  const nombres = new Map<string, string>([
    ['mora-id', 'Mora'],
    ['toto-id', 'Toto'],
    ['luna-id', 'Luna'],
    ['coco-id', 'Coco'],
  ]);

  const relHijo: RelacionAnimal = {
    id: 'r1',
    casoOrigenId: 'toto-id',
    tipoRelacion: 'HIJO_DE',
    casoDestinoId: 'mora-id',
    nombreDestino: 'Mora',
    updatedAt: 1000,
  };

  const relHermana: RelacionAnimal = {
    id: 'r2',
    casoOrigenId: 'luna-id',
    tipoRelacion: 'HERMANA_DE',
    casoDestinoId: 'mora-id',
    nombreDestino: 'Mora',
    updatedAt: 1000,
  };

  const relPapa: RelacionAnimal = {
    id: 'r3',
    casoOrigenId: 'coco-id',
    tipoRelacion: 'PAPA_DE',
    casoDestinoId: 'mora-id',
    nombreDestino: 'Mora',
    updatedAt: 1000,
  };

  test('muestra etiqueta directa en el animal origen (ej: "Hijo de Mora", "Hermana de Mora")', () => {
    const vHijo = etiquetaRelacionParaCaso(relHijo, 'toto-id', nombres);
    expect(vHijo.texto).toBe('Hijo de Mora');
    expect(vHijo.targetCasoId).toBe('mora-id');
    expect(vHijo.esSaliente).toBe(true);

    const vHermana = etiquetaRelacionParaCaso(relHermana, 'luna-id', nombres);
    expect(vHermana.texto).toBe('Hermana de Mora');
    expect(vHermana.targetCasoId).toBe('mora-id');

    const vPapa = etiquetaRelacionParaCaso(relPapa, 'coco-id', nombres);
    expect(vPapa.texto).toBe('Papá de Mora');
  });

  test('muestra lectura inversa en el animal destino apuntando al origen', () => {
    const desdeMora1 = etiquetaRelacionParaCaso(relHijo, 'mora-id', nombres);
    expect(desdeMora1.texto).toBe('Cría / Hijo(a): Toto');
    expect(desdeMora1.targetCasoId).toBe('toto-id');
    expect(desdeMora1.esSaliente).toBe(false);

    const desdeMora2 = etiquetaRelacionParaCaso(relHermana, 'mora-id', nombres);
    expect(desdeMora2.texto).toBe('Hermano/a: Luna');
    expect(desdeMora2.targetCasoId).toBe('luna-id');

    const desdeMora3 = etiquetaRelacionParaCaso(relPapa, 'mora-id', nombres);
    expect(desdeMora3.texto).toBe('Papá: Coco');
    expect(desdeMora3.targetCasoId).toBe('coco-id');
  });

  test('usa nombreDestino escrito manualmente cuando no hay casoDestinoId vinculado aún', () => {
    const relManual: RelacionAnimal = {
      id: 'r4',
      casoOrigenId: 'toto-id',
      tipoRelacion: 'MAMA_DE',
      casoDestinoId: null,
      nombreDestino: 'Misha',
      updatedAt: 1000,
    };
    const v = etiquetaRelacionParaCaso(relManual, 'toto-id', nombres);
    expect(v.texto).toBe('Mamá de Misha');
    expect(v.targetCasoId).toBeNull();
  });
});
