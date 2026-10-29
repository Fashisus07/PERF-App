import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Caso, EstadoCaso, ETIQUETA_ESTADO } from '../../../domain/models/Caso';
import { casoRepository } from '../../../di/container';
import { AppHeader } from '../../components/AppHeader';
import { colors, fonts } from '../../theme';

type FiltroArchivo = 'todos' | 'ADOPTADO' | 'FALLECIDO';

const FOTO_DEFAULT = require('../../../../assets/images/casos/misho.jpg');

export function ArchivoScreen({ navigation }: { navigation?: any }) {
  const [casosArchivados, setCasosArchivados] = useState<Caso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroArchivo>('todos');

  const cargar = useCallback(async () => {
    try {
      const lista = await casoRepository.obtenerArchivados();
      setCasosArchivados(lista);
    } catch {
      // Manejo silencioso
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const conteo = useMemo(() => {
    const adoptados = casosArchivados.filter((c) => c.estadoCaso === 'ADOPTADO').length;
    const fallecidos = casosArchivados.filter((c) => c.estadoCaso === 'FALLECIDO').length;
    return {
      todos: casosArchivados.length,
      adoptados,
      fallecidos,
      tasaExito: casosArchivados.length > 0
        ? Math.round((adoptados / casosArchivados.length) * 100)
        : 100,
    };
  }, [casosArchivados]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return casosArchivados.filter((c) => {
      const cumpleFiltro = filtro === 'todos' || c.estadoCaso === filtro;
      const cumpleBusqueda =
        !q ||
        c.nombreProvisorio.toLowerCase().includes(q) ||
        c.barrio.toLowerCase().includes(q) ||
        (c.transito.nombre && c.transito.nombre.toLowerCase().includes(q));
      return cumpleFiltro && cumpleBusqueda;
    });
  }, [casosArchivados, busqueda, filtro]);

  const verDetalle = (casoId: string) => {
    navigation?.navigate?.('DetalleCaso', { casoId });
  };

  const headerComponent = (
    <View style={styles.headerArea}>
      {/* Resumen de impacto */}
      <View style={styles.statsCard}>
        <View style={styles.statsTop}>
          <View style={styles.statsIconBox}>
            <MaterialIcons name="auto-awesome" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statsTitle}>Archivo Histórico PERF</Text>
            <Text style={styles.statsSub}>Registro de animales con ciclo de rescate cerrado</Text>
          </View>
        </View>

        <View style={styles.statsMetricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricNumber}>{conteo.todos}</Text>
            <Text style={styles.metricLabel}>Total Archivados</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricNumber, { color: colors.primary }]}>{conteo.adoptados}</Text>
            <Text style={styles.metricLabel}>Adoptados</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricNumber, { color: colors.aldiaText }]}>{conteo.tasaExito}%</Text>
            <Text style={styles.metricLabel}>Tasa de Adopción</Text>
          </View>
        </View>
      </View>

      {/* Buscador */}
      <View style={styles.search}>
        <MaterialIcons name="search" size={22} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, barrio o adoptante..."
          placeholderTextColor={colors.placeholder}
          value={busqueda}
          onChangeText={setBusqueda}
        />
        {busqueda ? (
          <Pressable onPress={() => setBusqueda('')} style={styles.clearBtn}>
            <MaterialIcons name="close" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Tabs / Chips */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, filtro === 'todos' && styles.tabActive]}
          onPress={() => setFiltro('todos')}
        >
          <Text style={[styles.tabText, filtro === 'todos' && styles.tabTextActive]}>
            Todos ({conteo.todos})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, filtro === 'ADOPTADO' && styles.tabActive]}
          onPress={() => setFiltro('ADOPTADO')}
        >
          <MaterialIcons
            name="favorite"
            size={14}
            color={filtro === 'ADOPTADO' ? colors.onPrimary : colors.primary}
          />
          <Text style={[styles.tabText, filtro === 'ADOPTADO' && styles.tabTextActive]}>
            Adoptados ({conteo.adoptados})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, filtro === 'FALLECIDO' && styles.tabActive]}
          onPress={() => setFiltro('FALLECIDO')}
        >
          <Text style={[styles.tabText, filtro === 'FALLECIDO' && styles.tabTextActive]}>
            Fallecidos ({conteo.fallecidos})
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <AppHeader subtitle="Archivo" />
      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando histórico de rescates...</Text>
        </View>
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListHeaderComponent={headerComponent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyCircle}>
                <MaterialIcons name="folder-special" size={56} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>
                {busqueda ? 'No se encontraron resultados' : 'No hay casos archivados'}
              </Text>
              <Text style={styles.emptySub}>
                {busqueda
                  ? 'Probá buscando con otro nombre o barrio.'
                  : 'Cuando cambies el estado de un caso a Adoptado o Fallecido, se archivará automáticamente aquí.'}
              </Text>
              <Pressable style={styles.emptyBtn} onPress={() => navigation?.navigate?.('Casos')}>
                <MaterialIcons name="pets" size={18} color={colors.primary} />
                <Text style={styles.emptyBtnText}>Ver casos activos</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => {
            const fotoSource = item.fotoUri ? { uri: item.fotoUri } : FOTO_DEFAULT;
            const esAdoptado = item.estadoCaso === 'ADOPTADO';
            const fechaCierre = new Date(item.updatedAt).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });

            return (
              <Pressable
                style={styles.card}
                onPress={() => verDetalle(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`Ver ficha de ${item.nombreProvisorio}`}
              >
                <View style={styles.cardTop}>
                  <Image source={fotoSource} style={styles.cardImg} resizeMode="cover" />
                  <View style={styles.cardInfo}>
                    <View style={styles.cardNameRow}>
                      <Text style={styles.cardName}>{item.nombreProvisorio}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          esAdoptado ? styles.badgeAdoptado : styles.badgeFallecido,
                        ]}
                      >
                        <MaterialIcons
                          name={esAdoptado ? 'favorite' : 'spa'}
                          size={13}
                          color={esAdoptado ? colors.aldiaText : colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: esAdoptado ? colors.aldiaText : colors.textMuted },
                          ]}
                        >
                          {ETIQUETA_ESTADO[item.estadoCaso ?? 'ADOPTADO']}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.cardSub}>
                      {item.especie} · {item.edadEstimada}
                    </Text>

                    <View style={styles.locationRow}>
                      <MaterialIcons name="place" size={15} color={colors.textMuted} />
                      <Text style={styles.locationText}>{item.barrio}</Text>
                      <Text style={styles.sepDot}>•</Text>
                      <Text style={styles.closeDate}>Cierre: {fechaCierre}</Text>
                    </View>
                  </View>
                </View>

                {item.transito.nombre ? (
                  <View style={styles.adopterRow}>
                    <MaterialIcons
                      name={esAdoptado ? 'home' : 'person'}
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={styles.adopterLabel}>
                      {esAdoptado ? 'Adoptante:' : 'Responsable:'}{' '}
                      <Text style={styles.adopterValue}>{item.transito.nombre}</Text>
                    </Text>
                  </View>
                ) : null}

                <View style={styles.cardFooter}>
                  <Text style={styles.viewHistory}>Ver ficha histórica completa</Text>
                  <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted },
  list: { padding: 16, paddingBottom: 110 },
  headerArea: { gap: 14, marginBottom: 16 },

  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statsIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  statsTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  statsSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  statsMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  metricItem: { flex: 1, alignItems: 'center', gap: 2 },
  metricNumber: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  metricLabel: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textMuted },
  metricDivider: { width: 1, height: 28, backgroundColor: colors.border },

  search: {
    height: 52,
    backgroundColor: colors.surface,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, height: 52, fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  clearBtn: { padding: 6 },

  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: colors.surfaceChip,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  tabTextActive: { color: colors.onPrimary },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', gap: 12 },
  cardImg: { width: 68, height: 68, borderRadius: 12, backgroundColor: colors.surfaceMuted },
  cardInfo: { flex: 1, gap: 4 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardName: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  cardSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  sepDot: { color: colors.textSubtle, fontSize: 12 },
  closeDate: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  badgeAdoptado: { backgroundColor: colors.aldiaBg },
  badgeFallecido: { backgroundColor: colors.surfaceChip },
  statusBadgeText: { fontFamily: fonts.bold, fontSize: 11 },

  adopterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceCard,
    padding: 10,
    borderRadius: 10,
  },
  adopterLabel: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  adopterValue: { fontFamily: fonts.bold, color: colors.text },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viewHistory: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
    paddingHorizontal: 24,
  },
  emptyCircle: {
    width: 96,
    height: 96,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceChip,
  },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, textAlign: 'center' },
  emptySub: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceChip,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  emptyBtnText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
});
