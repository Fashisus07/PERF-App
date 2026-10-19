import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../theme';

export function AvatarPerfil() {
  return (
    <View style={styles.avatar}>
      <MaterialIcons name="person" size={18} color="#fff" />
    </View>
  );
}

type Props = { titulo: string; subtitulo?: string; onCancelar: () => void };

// Encabezado de los 3 pasos: "× Cancelar", título centrado y avatar.
export function EncabezadoRescate({ titulo, subtitulo, onCancelar }: Props) {
  const { top } = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: top, backgroundColor: colors.background }}>
      <View style={styles.row}>
        <Pressable style={styles.cancelar} onPress={onCancelar} accessibilityLabel="Cancelar">
          <MaterialIcons name="close" size={20} color={colors.text} />
          <Text style={styles.cancelarText}>Cancelar</Text>
        </Pressable>
        <View style={styles.centro} pointerEvents="none">
          <Text style={styles.titulo}>{titulo}</Text>
          {!!subtitulo && <Text style={styles.subtitulo}>{subtitulo}</Text>}
        </View>
        <AvatarPerfil />
      </View>
    </View>
  );
}

// Tres segmentos que se van llenando según el paso actual.
export function SegmentosPaso({ paso }: { paso: 1 | 2 | 3 }) {
  return (
    <View style={styles.segmentos}>
      {[1, 2, 3].map((n) => (
        <View key={n} style={[styles.segmento, n <= paso && styles.segmentoLleno]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 36, height: 36, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  row: { height: 64, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cancelar: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44 },
  cancelarText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  centro: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  titulo: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  subtitulo: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSubtle },
  segmentos: { flexDirection: 'row', gap: 6 },
  segmento: { flex: 1, height: 6, borderRadius: 9999, backgroundColor: colors.surfaceChip },
  segmentoLleno: { backgroundColor: colors.primary },
});
