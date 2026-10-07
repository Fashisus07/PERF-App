import { MaterialIcons } from '@expo/vector-icons';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '../../components/AppHeader';
import { CasoCard } from '../../components/CasoCard';
import { FiltroUrgencia, useCasos } from '../../hooks/useCasos';
import { colors, fonts } from '../../theme';

const TABS: { key: FiltroUrgencia; label: string; dot?: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'urgente', label: 'Urgentes', dot: colors.urgente },
  { key: 'atencion', label: 'Atención', dot: colors.atencion },
  { key: 'aldia', label: 'Al día', dot: colors.aldia },
];

export function CasosScreen({ navigation }: { navigation?: any }) {
  const { visibles, conteo, busqueda, setBusqueda, filtro, setFiltro } = useCasos();

  return (
    <View style={styles.screen}>
      <AppHeader subtitle="Casos" />
      <FlatList
        data={visibles}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => <CasoCard caso={item} />}
        ListHeaderComponent={
          <View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryPill}>
                <View style={styles.summaryDot} />
                <Text style={styles.summaryUrgent}>{conteo.urgente} urgentes</Text>
                <Text style={styles.summarySep}>•</Text>
                <Text style={styles.summaryActive}>{conteo.todos} activos</Text>
              </View>
              <Pressable style={styles.filterBtn}>
                <MaterialIcons name="tune" size={18} color={colors.textMuted} />
                <Text style={styles.filterText}>Filtrar</Text>
              </Pressable>
            </View>
            <View style={styles.search}>
              <MaterialIcons name="search" size={22} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre o zona..."
                placeholderTextColor={colors.placeholder}
                value={busqueda}
                onChangeText={setBusqueda}
              />
            </View>
            <View style={styles.tabs}>
              {TABS.map((t) => {
                const activo = filtro === t.key;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => setFiltro(t.key)}
                    style={[styles.tab, activo && styles.tabActive]}
                  >
                    {t.dot && !activo && <View style={[styles.tabDot, { backgroundColor: t.dot }]} />}
                    <Text style={[styles.tabText, activo && styles.tabTextActive]}>
                      {t.label} ({conteo[t.key]})
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
      />
      <Pressable style={styles.fab} onPress={() => navigation?.navigate?.('NuevoRescate')}>
        <MaterialIcons name="add" size={22} color={colors.onPrimary} />
        <Text style={styles.fabText}>Nuevo rescate</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, paddingBottom: 110 },
  summaryRow: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.urgenteBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 },
  summaryDot: { width: 10, height: 10, borderRadius: 9999, backgroundColor: colors.urgente },
  summaryUrgent: { fontFamily: fonts.bold, fontSize: 14, color: colors.urgenteText },
  summarySep: { fontFamily: fonts.regular, fontSize: 15, color: colors.urgenteSoft },
  summaryActive: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceChip, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 },
  filterText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted },
  search: { height: 56, backgroundColor: colors.surface, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingLeft: 14, gap: 8 },
  searchInput: { flex: 1, height: 56, fontFamily: fonts.regular, fontSize: 16, color: colors.text, paddingRight: 40 },
  tabs: { flexDirection: 'row', gap: 8, paddingVertical: 8, marginBottom: 4 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9999, backgroundColor: colors.surfaceChip },
  tabActive: { backgroundColor: colors.primary, paddingHorizontal: 16 },
  tabDot: { width: 8, height: 8, borderRadius: 9999 },
  tabText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted },
  tabTextActive: { color: colors.onPrimary },
  fab: { position: 'absolute', right: 16, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingLeft: 20, paddingRight: 24, paddingVertical: 14, borderRadius: 9999, elevation: 6, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 4 } },
  fabText: { fontFamily: fonts.bold, fontSize: 15, color: colors.onPrimary },
});
