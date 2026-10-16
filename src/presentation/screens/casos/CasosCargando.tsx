import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../theme';

function Bloque({ w, h, r = 9999, color = colors.skeleton }: { w: number; h: number; r?: number; color?: string }) {
  return <View style={{ width: w, height: h, borderRadius: r, backgroundColor: color }} />;
}

function TarjetaSkeleton({ nombre, badge, d1, d2, fecha }: { nombre: number; badge: number; d1: number; d2: number; fecha: number }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.img} />
        <View style={styles.cardInfo}>
          <View style={styles.row1}>
            <Bloque w={nombre} h={16} r={6} />
            <Bloque w={badge} h={20} color="#eae8e4" />
          </View>
          <Bloque w={d1} h={12} r={4} color={colors.skeletonSoft} />
          <Bloque w={d2} h={12} r={4} color={colors.skeletonFaint} />
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Bloque w={fecha} h={14} color="#f3f1ed" />
        <Bloque w={96} h={34} color={colors.skeletonCta} />
      </View>
    </View>
  );
}

export function CasosCargando() {
  return (
    <ScrollView contentContainerStyle={styles.content} scrollEnabled={false}>
      <View style={styles.statusRow}>
        <View style={styles.syncLabel}>
          <View style={styles.dot} />
          <Text style={styles.syncText}>Sincronizando casos</Text>
        </View>
        <View style={styles.serverBadge}>
          <MaterialIcons name="sync" size={15} color={colors.primary} />
          <Text style={styles.serverText}>PERF Server</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.statsHeader}>
          <Bloque w={128} h={16} color="#eae8e4" />
          <Bloque w={64} h={20} color="#efeeeb" />
        </View>
        <View style={styles.statsCols}>
          {[48, 56, 48].map((w, i) => (
            <View key={i} style={styles.statCol}>
              <Bloque w={w} h={12} color="#edebe7" />
              <Bloque w={32} h={24} r={6} color="#e5e2dd" />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.search}>
        <MaterialIcons name="search" size={20} color="#bdc9c6" />
        <Bloque w={176} h={16} color="#edebe7" />
        <View style={{ flex: 1 }} />
        <Bloque w={28} h={28} color="#f2f0ee" />
      </View>

      <View style={styles.chips}>
        {[80, 96, 88, 64].map((w, i) => (
          <Bloque key={i} w={w} h={32} color={i === 0 ? '#edeae6' : '#f3f1ed'} />
        ))}
      </View>

      <View style={styles.banner}>
        <MaterialIcons name="cloud-download" size={16} color={colors.primary} />
        <Text style={styles.bannerText}>Actualizando casos con el servidor...</Text>
      </View>

      <View style={styles.cards}>
        <TarjetaSkeleton nombre={112} badge={64} d1={144} d2={96} fecha={112} />
        <TarjetaSkeleton nombre={127} badge={80} d1={160} d2={80} fecha={128} />
        <TarjetaSkeleton nombre={96} badge={64} d1={128} d2={112} fecha={96} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 110, gap: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  syncLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 9999, backgroundColor: colors.primary },
  syncText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
  serverBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceMuted, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 },
  serverText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  stats: { backgroundColor: colors.surfaceCard, borderRadius: 12, padding: 16, gap: 8 },
  statsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statsCols: { flexDirection: 'row', gap: 4 },
  statCol: { flex: 1, height: 60, borderRadius: 8, padding: 8, gap: 4, backgroundColor: '#f6f4f2' },
  search: { height: 48, backgroundColor: colors.surface, borderRadius: 9999, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  chips: { flexDirection: 'row', gap: 6, height: 36, alignItems: 'center', overflow: 'hidden' },
  banner: { height: 32, backgroundColor: colors.bannerInfo, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  bannerText: { fontFamily: fonts.regular, fontSize: 14, color: colors.primary },
  cards: { gap: 8 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 12 },
  cardTop: { flexDirection: 'row', gap: 12 },
  img: { width: 72, height: 72, borderRadius: 12, backgroundColor: colors.skeleton },
  cardInfo: { flex: 1, gap: 8 },
  row1: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
