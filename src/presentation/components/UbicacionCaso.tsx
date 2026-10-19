import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Caso, cambioDeLugar, rescateDe } from '../../domain/models/Caso';
import { colors, fonts } from '../theme';

// Muestra con rótulos dónde está el animal ahora y, si lo derivaron a otro lado, dónde se lo rescató.
export function UbicacionCaso({ caso, detalle }: { caso: Caso; detalle?: boolean }) {
  const movido = cambioDeLugar(caso);
  const actual = detalle && !movido && caso.direccion ? `${caso.ubicacion} · ${caso.direccion}` : caso.ubicacion;
  const r = rescateDe(caso);
  return (
    <View style={styles.box}>
      <View style={styles.row}>
        <MaterialIcons
          name={caso.ubicacionTipo === 'veterinaria' ? 'local-hospital' : 'location-on'}
          size={16}
          color={colors.primary}
        />
        <Text style={styles.texto} numberOfLines={1}>
          <Text style={styles.rotulo}>Ubicación actual: </Text>
          {actual}
        </Text>
      </View>
      {movido && (
        <View style={styles.row}>
          <MaterialIcons name="flag" size={16} color={colors.textSubtle} />
          <Text style={styles.texto} numberOfLines={1}>
            <Text style={styles.rotulo}>Rescatado en: </Text>
            {r.barrio ? `${r.lugar} · ${r.barrio}` : r.lugar}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 2, flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rotulo: { fontFamily: fonts.regular, color: colors.textSubtle },
  texto: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
});
