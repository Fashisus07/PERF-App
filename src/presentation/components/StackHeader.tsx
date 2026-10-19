import { MaterialIcons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';

type Props = {
  titulo: string;
  onBack?: () => void;
  icono?: 'arrow-back' | 'close';
  tituloColor?: string;
  derecha?: ReactNode;
};

// Encabezado de las pantallas internas (detalle, cambio de estado, etc.).
export function StackHeader({ titulo, onBack, icono = 'arrow-back', tituloColor = colors.text, derecha }: Props) {
  const { top } = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: top }]}>
      <View style={styles.row}>
        <Pressable style={styles.back} onPress={onBack} accessibilityLabel={icono === 'close' ? 'Cerrar' : 'Volver'}>
          <MaterialIcons name={icono} size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.titulo, { color: tituloColor }]} numberOfLines={1}>{titulo}</Text>
        {derecha && <View style={styles.derecha}>{derecha}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.surfaceHeader, borderBottomWidth: 1, borderBottomColor: colors.border },
  row: { height: 64, justifyContent: 'center' },
  back: { position: 'absolute', left: 4, width: 48, height: 48, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontFamily: fonts.bold, fontSize: 18, textAlign: 'center', marginHorizontal: 64 },
  derecha: { position: 'absolute', right: 16 },
});
