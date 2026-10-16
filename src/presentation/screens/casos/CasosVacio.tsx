import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../theme';

type Props = { onSincronizar?: () => void; onNuevoRescate?: () => void };

export function CasosVacio({ onSincronizar, onNuevoRescate }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <View style={styles.zona}>
          <View style={styles.zonaDot} />
          <Text style={styles.zonaText}>Zona AMBA · Guardia activa</Text>
        </View>
        <Pressable style={styles.sync} onPress={onSincronizar}>
          <MaterialIcons name="sync" size={18} color={colors.primary} />
          <Text style={styles.syncText}>Sincronizar</Text>
        </Pressable>
      </View>

      <View style={styles.empty}>
        <View style={styles.circle}>
          <MaterialIcons name="pets" size={72} color={colors.atencion} />
        </View>
        <View style={styles.textos}>
          <Text style={styles.title}>Todavía no hay rescates</Text>
          <Text style={styles.body}>
            Tocá el botón <Text style={styles.plus}>+</Text> para registrar el primero, o sincronizá si tenés turnos
            asignados.
          </Text>
        </View>
        <Pressable style={styles.cta} onPress={onNuevoRescate}>
          <MaterialIcons name="pets" size={22} color={colors.onPrimary} />
          <Text style={styles.ctaText}>+ Registrar primer rescate</Text>
        </Pressable>
      </View>

      <View style={styles.tip}>
        <View style={styles.tipHeader}>
          <View style={styles.tipTitle}>
            <MaterialIcons name="lightbulb" size={20} color={colors.atencion} />
            <Text style={styles.tipTitleText}>Tip de guardia PERF</Text>
          </View>
          <View style={styles.tipBadge}>
            <Text style={styles.tipBadgeText}>Protocolo</Text>
          </View>
        </View>
        <View style={styles.tipBody}>
          <View style={styles.tipIcon}>
            <MaterialIcons name="medical-services" size={20} color={colors.atencionText} />
          </View>
          <Text style={styles.tipText}>
            Si el felino presenta dificultades respiratorias o hemorragia, priorizá el triaje{' '}
            <Text style={styles.urgente}>Urgente</Text> para notificar automáticamente a la clínica más cercana.
          </Text>
        </View>
      </View>

      <View style={styles.toast}>
        <MaterialIcons name="cloud-done" size={20} color={colors.toastIcon} />
        <Text style={styles.toastText}>Sincronizado con base de datos central.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 12, paddingBottom: 110, gap: 12 },
  topRow: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  zona: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceMuted, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 },
  zonaDot: { width: 7, height: 7, borderRadius: 9999, backgroundColor: colors.brand },
  zonaText: { fontFamily: fonts.bold, fontSize: 14, color: colors.textMuted },
  sync: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceMuted, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 },
  syncText: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },

  empty: { backgroundColor: colors.surfaceCard, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 24, alignItems: 'center', gap: 16 },
  circle: { width: 160, height: 160, borderRadius: 9999, backgroundColor: colors.emptyCircle, alignItems: 'center', justifyContent: 'center' },
  textos: { gap: 8, alignItems: 'center', alignSelf: 'stretch' },
  title: { fontFamily: fonts.semibold, fontSize: 22, color: colors.text, textAlign: 'center' },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: 'center' },
  plus: { fontFamily: fonts.bold, color: colors.primary },
  cta: { alignSelf: 'stretch', height: 52, borderRadius: 9999, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
  ctaText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.onPrimary },

  tip: { backgroundColor: colors.surfaceMuted, borderRadius: 12, padding: 16, gap: 10 },
  tipHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tipTitle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tipTitleText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.atencion },
  tipBadge: { backgroundColor: colors.surfaceChip, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  tipBadgeText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  tipBody: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipIcon: { width: 36, height: 36, borderRadius: 9999, backgroundColor: colors.atencionBg, alignItems: 'center', justifyContent: 'center' },
  tipText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  urgente: { fontFamily: fonts.bold, color: colors.urgenteAlerta },

  toast: { backgroundColor: colors.toast, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  toastText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.toastText },
});
