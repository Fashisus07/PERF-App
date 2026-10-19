import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Urgencia } from '../../domain/models/Caso';
import { colors, fonts } from '../theme';

const CONFIG = {
  urgente: { label: 'Urgente', icon: 'warning', iconGrande: 'error', bg: colors.urgenteBg, fg: colors.urgenteText },
  atencion: { label: 'Atención', icon: 'schedule', iconGrande: 'schedule', bg: colors.atencionBg, fg: colors.atencionText },
  aldia: { label: 'Al día', icon: 'check-circle', iconGrande: 'check-circle', bg: colors.aldiaBg, fg: colors.aldiaText },
} as const;

// `grande` es la variante de la ficha de detalle (más grande y con otro ícono).
export function UrgenciaBadge({ urgencia, grande }: { urgencia: Urgencia; grande?: boolean }) {
  const c = CONFIG[urgencia];
  return (
    <View style={[styles.badge, grande && styles.badgeGrande, { backgroundColor: c.bg }]}>
      <MaterialIcons name={grande ? c.iconGrande : c.icon} size={grande ? 18 : 14} color={c.fg} />
      <Text style={[styles.text, grande && styles.textGrande, { color: c.fg }]}>{c.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 },
  badgeGrande: { gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  textGrande: { fontFamily: fonts.bold, fontSize: 14 },
  text: { fontFamily: fonts.semibold, fontSize: 13 },
});
