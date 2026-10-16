import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts } from '../theme';

export function NuevoRescateFab({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable style={styles.fab} onPress={onPress} accessibilityRole="button">
      <MaterialIcons name="add" size={22} color={colors.onPrimary} />
      <Text style={styles.text}>Nuevo rescate</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingLeft: 20,
    paddingRight: 24,
    paddingVertical: 14,
    borderRadius: 9999,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  text: { fontFamily: fonts.bold, fontSize: 15, color: colors.onPrimary },
});
