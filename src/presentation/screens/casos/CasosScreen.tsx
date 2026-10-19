import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '../../components/AppHeader';
import { CasoCard } from '../../components/CasoCard';
import { CasoOfflineCard } from '../../components/CasoOfflineCard';
import { NuevoRescateFab } from '../../components/NuevoRescateFab';
import { FiltroUrgencia, useCasos } from '../../hooks/useCasos';
import { useOnline } from '../../hooks/useOnline';
import { colors, fonts } from '../../theme';
import { CasosCargando } from './CasosCargando';
import { CasosError } from './CasosError';
import { CasosVacio } from './CasosVacio';

const TABS: { key: FiltroUrgencia; label: string; dot?: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'urgente', label: 'Urgentes', dot: colors.urgente },
  { key: 'atencion', label: 'Atención', dot: colors.atencion },
  { key: 'aldia', label: 'Al día', dot: colors.aldia },
];

function horaLocal(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function CasosScreen({ navigation }: { navigation?: any }) {
  const { visibles, casos, conteo, cargando, error, recargar, busqueda, setBusqueda, filtro, setFiltro } = useCasos();
  const online = useOnline();
  const [ultimaSync, setUltimaSync] = useState<Date | null>(null);
  useEffect(() => {
    if (online) setUltimaSync(new Date());
  }, [online]);

  const verFicha = (id: string) => navigation?.navigate?.('DetalleCaso', { casoId: id });
  const nuevoRescate = () => navigation?.navigate?.('NuevoRescate');

  if (cargando) {
    return (
      <View style={styles.screen}>
        <AppHeader subtitle="Casos" />
        <CasosCargando />
        <NuevoRescateFab onPress={nuevoRescate} />
      </View>
    );
  }

  if (error || (!online && casos.length === 0)) {
    return (
      <View style={styles.screen}>
        <AppHeader subtitle="Casos" />
        <CasosError guardados={casos} onReintentar={recargar} onNuevoRescate={nuevoRescate} />
      </View>
    );
  }

  if (casos.length === 0) {
    return (
      <View style={styles.screen}>
        <AppHeader subtitle="Casos" />
        <CasosVacio onSincronizar={recargar} onNuevoRescate={nuevoRescate} />
        <NuevoRescateFab onPress={nuevoRescate} />
      </View>
    );
  }

  const tabs = (
    <View style={styles.tabs}>
      {TABS.map((t) => {
        const activo = filtro === t.key;
        return (
          <Pressable key={t.key} onPress={() => setFiltro(t.key)} style={[styles.tab, activo && styles.tabActive]}>
            {t.dot && !activo && <View style={[styles.tabDot, { backgroundColor: t.dot }]} />}
            <Text style={[styles.tabText, activo && styles.tabTextActive]}>
              {t.label} ({conteo[t.key]})
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const headerOnline = (
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
      {tabs}
    </View>
  );

  const headerOffline = (
    <View style={{ gap: 12 }}>
      <View style={styles.offBanner}>
        <MaterialIcons name="cloud-off" size={30} color={colors.atencion} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.offBannerTitle}>Sin conexión. Todo se guarda en tu teléfono.</Text>
          <Text style={styles.offBannerText}>
            Última sincronización: {ultimaSync ? `Hoy ${horaLocal(ultimaSync)} hs` : 'sin datos'} · Modo local activo
          </Text>
        </View>
        <View style={styles.offBannerDot} />
      </View>
      <View style={styles.triageRow}>
        <View style={styles.triageLeft}>
          <Text style={styles.triageTitle}>Triage en Terreno</Text>
          <View style={styles.memoria}>
            <Text style={styles.memoriaText}>{conteo.todos} en memoria</Text>
            <MaterialIcons name="check-circle" size={12} color={colors.textMuted} />
          </View>
        </View>
        <Text style={styles.cacheLink}>Caché offline</Text>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <View style={[styles.statIcon, { backgroundColor: colors.urgenteBg }]}>
            <MaterialIcons name="error" size={18} color={colors.urgente} />
          </View>
          <View>
            <Text style={[styles.statValue, { color: colors.urgente }]}>{conteo.urgente} urgentes</Text>
            <Text style={styles.statLabel}>Requieren clínica</Text>
          </View>
        </View>
        <View style={styles.stat}>
          <View style={[styles.statIcon, { backgroundColor: colors.surfaceChip }]}>
            <MaterialIcons name="pets" size={18} color={colors.textMuted} />
          </View>
          <View>
            <Text style={styles.statValue}>{conteo.todos} activos</Text>
            <Text style={styles.statLabel}>En caché local</Text>
          </View>
        </View>
      </View>
      {tabs}
    </View>
  );

  return (
    <View style={styles.screen}>
      <AppHeader subtitle="Casos" />
      <FlatList
        data={visibles}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) =>
          online ? (
            <CasoCard caso={item} onPress={() => verFicha(item.id)} />
          ) : (
            <CasoOfflineCard caso={item} onFicha={() => verFicha(item.id)} />
          )
        }
        ListHeaderComponent={online ? headerOnline : headerOffline}
        ListFooterComponent={
          online ? null : (
            <View style={styles.offFooter}>
              <MaterialIcons name="cloud-done" size={16} color={colors.textMuted} />
              <Text style={styles.offFooterText}>Los cambios se sincronizarán al recuperar señal</Text>
            </View>
          )
        }
      />
      <NuevoRescateFab onPress={nuevoRescate} />
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
  offBanner: { backgroundColor: colors.offlineBanner, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  offBannerTitle: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.text },
  offBannerText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.atencion },
  offBannerDot: { width: 8, height: 8, borderRadius: 9999, backgroundColor: colors.atencion },
  triageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  triageLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  triageTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.primary },
  memoria: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceChip, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  memoriaText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  cacheLink: { fontFamily: fonts.bold, fontSize: 14, color: colors.atencion },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 12, padding: 10 },
  statIcon: { width: 36, height: 36, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  statLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  offFooter: { marginTop: 16, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceChip, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 },
  offFooterText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
});
