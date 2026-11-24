import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Urgencia } from '../../domain/models/Caso';
import { colors, fonts } from '../theme';

const CONFIG = {
  urgente: {
    label: 'Urgente',
    icon: 'warning' as const,
    iconGrande: 'error' as const,
    bg: colors.urgenteBg,
    fg: colors.urgenteText,
  },
  atencion: {
    label: 'Atención',
    icon: 'schedule' as const,
    iconGrande: 'schedule' as const,
    bg: colors.atencionBg,
    fg: colors.atencionText,
  },
  aldia: {
    label: 'Al día',
    icon: 'check-circle' as const,
    iconGrande: 'check-circle' as const,
    bg: colors.aldiaBg,
    fg: colors.aldiaText,
  },
} as const;

export function UrgenciaBadge({
  urgencia,
  grande,
  motivo,
}: {
  urgencia: Urgencia;
  grande?: boolean;
  motivo?: string;
}) {
  const c = CONFIG[urgencia] || CONFIG.aldia;
  const texto = motivo || c.label;

  return (
    <View style={[styles.badge, grande && styles.badgeGrande, { backgroundColor: c.bg }]}>
      <MaterialIcons name={grande ? c.iconGrande : c.icon} size={grande ? 18 : 14} color={c.fg} />
      <Text style={[styles.text, grande && styles.textGrande, { color: c.fg }]} numberOfLines={1}>
        {texto}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  badgeGrande: {
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  textGrande: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  text: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
});
