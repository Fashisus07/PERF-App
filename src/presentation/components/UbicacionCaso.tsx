import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Caso } from '../../domain/models/Caso';
import { colors, fonts } from '../theme';

export function UbicacionCaso({ caso, detalle }: { caso: Caso; detalle?: boolean }) {
  const ubicacionActual = caso.transito.nombre
    ? `Tránsito: ${caso.transito.nombre}`
    : `Rescate: ${caso.barrio}`;

  return (
    <View style={styles.box}>
      <View style={styles.row}>
        <MaterialIcons
          name={caso.estadoCaso === 'EN_CLINICA' ? 'local-hospital' : 'home'}
          size={16}
          color={colors.primary}
        />
        <Text style={styles.texto} numberOfLines={1}>
          <Text style={styles.rotulo}>Ubicación: </Text>
          {ubicacionActual}
        </Text>
      </View>
      <View style={styles.row}>
        <MaterialIcons name="place" size={16} color={colors.textSubtle} />
        <Text style={styles.texto} numberOfLines={1}>
          <Text style={styles.rotulo}>Barrio: </Text>
          {caso.barrio}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 2, flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rotulo: { fontFamily: fonts.regular, color: colors.textSubtle },
  texto: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
});
