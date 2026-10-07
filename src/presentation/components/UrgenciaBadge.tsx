import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Urgencia } from '../../domain/models/Caso';
import { colors, fonts } from '../theme';

const CONFIG = {
  urgente: { label: 'Urgente', icon: 'warning', bg: colors.urgenteBg, fg: colors.urgenteText },
  atencion: { label: 'Atención', icon: 'schedule', bg: colors.atencionBg, fg: colors.atencionText },
  aldia: { label: 'Al día', icon: 'check-circle', bg: colors.aldiaBg, fg: colors.aldiaText },
} as const;

export function UrgenciaBadge({ urgencia }: { urgencia: Urgencia }) {
  const c = CONFIG[urgencia];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <MaterialIcons name={c.icon} size={14} color={c.fg} />
      <Text style={[styles.text, { color: c.fg }]}>{c.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 },
  text: { fontFamily: fonts.semibold, fontSize: 13 },
});
