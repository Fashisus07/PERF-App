import { ImageSourcePropType } from 'react-native';

const FOTOS_FALLBACK: ImageSourcePropType[] = [
  require('../../../assets/images/casos/canela.jpg'),
  require('../../../assets/images/casos/luna.jpg'),
  require('../../../assets/images/casos/misho.jpg'),
  require('../../../assets/images/casos/mora.jpg'),
  require('../../../assets/images/casos/oreo.jpg'),
  require('../../../assets/images/casos/pelusa.jpg'),
  require('../../../assets/images/casos/tigre.jpg'),
];

export function fotoCasoSource(caso?: { id?: string; fotoUri?: string | null }): ImageSourcePropType {
  if (caso?.fotoUri) return { uri: caso.fotoUri };
  const id = caso?.id || '';
  let sum = 0;
  for (let i = 0; i < id.length; i++) {
    sum = (sum + id.charCodeAt(i)) % 997;
  }
  return FOTOS_FALLBACK[sum % FOTOS_FALLBACK.length];
}
