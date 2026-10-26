import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Caso } from '../../../domain/models/Caso';
import { NuevoRescateFab } from '../../components/NuevoRescateFab';
import { colors, fonts } from '../../theme';

const BADGE = {
  urgente: { label: 'Urgente', bg: colors.urgenteBg, fg: colors.urgenteText, dot: colors.urgente },
  atencion: { label: 'Atención', bg: colors.atencionBg, fg: colors.atencionText, dot: colors.atencion },
  aldia: { label: 'Al día', bg: colors.aldiaBg, fg: colors.aldiaText, dot: colors.aldia },
} as const;

type Props = {
  guardados: Caso[];
  onReintentar: () => void;
  onNuevoRescate?: () => void;
};

export function CasosError({ guardados, onReintentar, onNuevoRescate }: Props) {
  const pendientes = guardados.filter((c) => c.syncStatus === 'PENDING').length;
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.aviso}>
          <View style={styles.avisoIcon}>
            <MaterialIcons name="sync-problem" size={18} color={colors.bannerWarnBadgeText} />
          </View>
          <View style={styles.avisoBody}>
            <View style={styles.avisoTop}>
              <Text style={styles.avisoTitle}>Sincronización pausada</Text>
              <View style={styles.avisoBadge}>
                <Text style={styles.avisoBadgeText}>Offline</Text>
              </View>
            </View>
            <Text style={styles.avisoText}>
              Problema al sincronizar con el servidor central de PERF. Guardando cambios localmente.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.errorOuter}>
            <View style={styles.errorInner}>
              <MaterialIcons name="wifi-off" size={40} color={colors.urgente} />
            </View>
          </View>
          <View style={styles.textos}>
            <Text style={styles.title}>No pudimos cargar los casos</Text>
            <Text style={styles.body}>
              Hubo una falla temporal al conectar con la base de datos de rescates. Tus datos locales guardados en
              este dispositivo están protegidos y seguros.
            </Text>
          </View>
          <View style={styles.botones}>
            <Pressable style={styles.btnPrimary} onPress={onReintentar}>
              <MaterialIcons name="sync" size={20} color={colors.onPrimary} />
              <Text style={styles.btnPrimaryText}>Reintentar conexión</Text>
            </Pressable>
            <Pressable style={styles.btnSecondary}>
              <MaterialIcons name="folder-special" size={20} color={colors.primary} />
              <Text style={styles.btnSecondaryText}>Ver datos guardados en caché</Text>
            </Pressable>
          </View>
          {pendientes > 0 && (
            <View style={styles.pie}>
              <MaterialIcons name="check-circle" size={16} color={colors.aldia} />
              <Text style={styles.pieText}>
                {pendientes} {pendientes === 1 ? 'caso pendiente' : 'casos pendientes'} de sincronizar listos en memoria
              </Text>
            </View>
          )}
        </View>

        {guardados.length > 0 && (
          <View style={styles.card2}>
            <View style={styles.card2Header}>
              <View style={styles.card2Title}>
                <MaterialIcons name="shelves" size={18} color={colors.primary} />
                <Text style={styles.card2TitleText}>En este dispositivo</Text>
              </View>
              <View style={styles.modoBadge}>
                <Text style={styles.modoBadgeText}>Modo Offline Activo</Text>
              </View>
            </View>
            <View style={{ gap: 6 }}>
              {guardados.slice(0, 2).map((c) => {
                const b = BADGE[c.esUrgente ? 'urgente' : 'aldia'];
                return (
                  <View key={c.id} style={styles.fila}>
                    <View style={[styles.filaIcon, { backgroundColor: b.bg }]}>
                      <MaterialIcons name="pets" size={18} color={b.fg} />
                    </View>
                    <View style={styles.filaInfo}>
                      <Text style={styles.filaNombre} numberOfLines={1}>{c.nombreProvisorio}</Text>
                      <Text style={styles.filaDetalle} numberOfLines={1}>
                        {c.barrio} {c.transito.nombre ? `• Tránsito: ${c.transito.nombre}` : ''}
                      </Text>
                    </View>
                    <View style={[styles.filaBadge, { backgroundColor: b.bg }]}>
                      <Text style={[styles.filaBadgeText, { color: b.fg }]}>{b.label}</Text>
                      <View style={[styles.filaBadgeDot, { backgroundColor: b.dot }]} />
                    </View>
                  </View>
                );
              })}
            </View>
            <Pressable style={styles.nuevo} onPress={onNuevoRescate}>
              <MaterialIcons name="add" size={20} color={colors.onPrimary} />
              <Text style={styles.nuevoText}>Nuevo rescate</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      {guardados.length === 0 && <NuevoRescateFab onPress={onNuevoRescate} />}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 12, paddingBottom: 110, gap: 16 },
  aviso: { backgroundColor: colors.bannerWarn, borderRadius: 12, padding: 16, flexDirection: 'row', gap: 12 },
  avisoIcon: { width: 32, height: 32, borderRadius: 9999, backgroundColor: colors.bannerWarnIcon, alignItems: 'center', justifyContent: 'center' },
  avisoBody: { flex: 1, gap: 4 },
  avisoTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avisoTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.bannerWarnTitle },
  avisoBadge: { backgroundColor: colors.bannerWarnBadge, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  avisoBadgeText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.bannerWarnBadgeText },
  avisoText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.bannerWarnText },

  card: { backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 20, alignItems: 'center', gap: 16 },
  errorOuter: { width: 96, height: 96, borderRadius: 9999, backgroundColor: colors.errorCircleOuter, alignItems: 'center', justifyContent: 'center' },
  errorInner: { width: 72, height: 72, borderRadius: 9999, backgroundColor: colors.errorCircleInner, alignItems: 'center', justifyContent: 'center' },
  textos: { gap: 8, alignSelf: 'stretch', alignItems: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.text, textAlign: 'center' },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted, textAlign: 'center' },
  botones: { gap: 8, alignSelf: 'stretch' },
  btnPrimary: { height: 52, borderRadius: 9999, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnPrimaryText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.onPrimary },
  btnSecondary: { height: 48, borderRadius: 9999, backgroundColor: colors.surfaceChip, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnSecondaryText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
  pie: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'stretch' },
  pieText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: '#656d6c' },

  card2: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 12 },
  card2Header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card2Title: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  card2TitleText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  modoBadge: { backgroundColor: colors.surfaceMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  modoBadgeText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textMuted },
  fila: { backgroundColor: colors.surfaceCard, borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  filaIcon: { width: 36, height: 36, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  filaInfo: { flex: 1 },
  filaNombre: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  filaDetalle: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  filaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  filaBadgeText: { fontFamily: fonts.semibold, fontSize: 11 },
  filaBadgeDot: { width: 6, height: 6, borderRadius: 9999 },
  nuevo: { height: 48, borderRadius: 9999, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 24 },
  nuevoText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.onPrimary },
});
