import { ImageSourcePropType } from 'react-native';
import { Especie } from '../../domain/models/Caso';

const FOTOS_GATOS: ImageSourcePropType[] = [
  require('../../../assets/images/casos/canela.jpg'),
  require('../../../assets/images/casos/luna.jpg'),
  require('../../../assets/images/casos/misho.jpg'),
  require('../../../assets/images/casos/oreo.jpg'),
  require('../../../assets/images/casos/pelusa.jpg'),
  require('../../../assets/images/casos/tigre.jpg'),
];

const FOTOS_PERROS: ImageSourcePropType[] = [
  require('../../../assets/images/casos/mora.jpg'),
  require('../../../assets/images/casos/kira.jpg'),
  require('../../../assets/images/casos/toby.jpg'),
  require('../../../assets/images/casos/coco.jpg'),
];

const FOTOS_TODAS: ImageSourcePropType[] = [...FOTOS_GATOS, ...FOTOS_PERROS];

export function fotoCasoSource(caso?: { id?: string; especie?: Especie; fotoUri?: string | null }): ImageSourcePropType {
  if (caso?.fotoUri) return { uri: caso.fotoUri };
  const lista =
    caso?.especie === 'Perro'
      ? FOTOS_PERROS
      : caso?.especie === 'Gato'
        ? FOTOS_GATOS
        : FOTOS_TODAS;
  const seed = caso?.id ?? 'default';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return lista[hash % lista.length];
}
