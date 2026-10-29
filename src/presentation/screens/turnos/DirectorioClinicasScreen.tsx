import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { turnoRepository } from '../../../di/container';
import { Clinica } from '../../../domain/models/Turno';
import { StackHeader } from '../../components/StackHeader';
import { colors, fonts } from '../../theme';

type Props = {
  navigation?: any;
};

type FiltroTipo = 'todas' | 'guardia' | 'consultorio' | 'quirurgico' | 'abiertas';

export function DirectorioClinicasScreen({ navigation }: Props) {
  const { bottom } = useSafeAreaInsets();
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroTipo>('todas');

  useEffect(() => {
    turnoRepository
      .obtenerClinicas()
      .then((data) => {
        setClinicas(data);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, []);

  const clinicasFiltradas = useMemo(() => {
    return clinicas.filter((c) => {
      const q = busqueda.trim().toLowerCase();
      const coincideBusqueda =
        !q ||
        c.nombre.toLowerCase().includes(q) ||
        c.barrio.toLowerCase().includes(q) ||
        c.direccion.toLowerCase().includes(q) ||
        (c.medico && c.medico.toLowerCase().includes(q));

      if (!coincideBusqueda) return false;

      if (filtro === 'guardia') {
        return (
          c.tipo === 'hospital' ||
          (c.detalle && c.detalle.toLowerCase().includes('guardia'))
        );
      }
      if (filtro === 'consultorio') {
        return c.tipo === 'consultorio';
      }
      if (filtro === 'quirurgico') {
        return c.tipo === 'quirurgico';
      }
      if (filtro === 'abiertas') {
        return c.abierto;
      }
      return true;
    });
  }, [clinicas, busqueda, filtro]);

  const llamar = (c: Clinica) => {
    Linking.openURL(`tel:${c.telefono}`);
  };

  const abrirMapa = (c: Clinica) => {
    const q = encodeURIComponent(`${c.nombre} ${c.direccion} ${c.barrio}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  };

  return (
    <View style={styles.screen}>
      <StackHeader titulo="Directorio Veterinario" onBack={() => navigation?.goBack?.()} />

      {/* Barra de Búsqueda MD3 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={22} color={colors.textSubtle} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por clínica, barrio o médico..."
            placeholderTextColor={colors.placeholderField}
            value={busqueda}
            onChangeText={setBusqueda}
          />
          {busqueda.length > 0 && (
            <Pressable onPress={() => setBusqueda('')} hitSlop={8}>
              <MaterialIcons name="close" size={20} color={colors.textSubtle} />
            </Pressable>
          )}
        </View>

        {/* Chips de Filtro MD3 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          <Pressable
            style={[styles.chip, filtro === 'todas' && styles.chipActivo]}
            onPress={() => setFiltro('todas')}
          >
            <Text style={[styles.chipText, filtro === 'todas' && styles.chipTextActivo]}>
              Todas ({clinicas.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.chip, filtro === 'guardia' && styles.chipActivoUrgente]}
            onPress={() => setFiltro('guardia')}
          >
            <MaterialIcons
              name="emergency"
              size={16}
              color={filtro === 'guardia' ? colors.urgenteText : colors.urgente}
            />
            <Text style={[styles.chipText, filtro === 'guardia' && styles.chipTextUrgente]}>
              Guardia 24 hs
            </Text>
          </Pressable>

          <Pressable
            style={[styles.chip, filtro === 'abiertas' && styles.chipActivo]}
            onPress={() => setFiltro('abiertas')}
          >
            <MaterialIcons
              name="schedule"
              size={16}
              color={filtro === 'abiertas' ? colors.onPrimary : colors.aldia}
            />
            <Text style={[styles.chipText, filtro === 'abiertas' && styles.chipTextActivo]}>
              Abiertas ahora
            </Text>
          </Pressable>

          <Pressable
            style={[styles.chip, filtro === 'quirurgico' && styles.chipActivo]}
            onPress={() => setFiltro('quirurgico')}
          >
            <Text style={[styles.chipText, filtro === 'quirurgico' && styles.chipTextActivo]}>
              Quirúrgicas
            </Text>
          </Pressable>

          <Pressable
            style={[styles.chip, filtro === 'consultorio' && styles.chipActivo]}
            onPress={() => setFiltro('consultorio')}
          >
            <Text style={[styles.chipText, filtro === 'consultorio' && styles.chipTextActivo]}>
              Consultorios
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {cargando ? (
        <View style={styles.centro}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Banner de Emergencia y Traslados */}
          <View style={styles.bannerEmergencia}>
            <View style={styles.bannerIcono}>
              <MaterialIcons name="local-hospital" size={24} color={colors.urgente} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitulo}>Red de Clínicas Amigas PERF</Text>
              <Text style={styles.bannerTexto}>
                Centros con convenio para rescate animal, cirugías de castración y urgencias nocturnas.
              </Text>
            </View>
          </View>

          {clinicasFiltradas.length === 0 ? (
            <View style={styles.vacio}>
              <MaterialIcons name="search-off" size={48} color={colors.textSubtle} />
              <Text style={styles.vacioTitulo}>No se encontraron centros</Text>
              <Text style={styles.vacioSub}>Probá ajustando la búsqueda o el filtro seleccionado.</Text>
            </View>
          ) : (
            clinicasFiltradas.map((c) => {
              const esGuardia =
                c.tipo === 'hospital' || (c.detalle && c.detalle.toLowerCase().includes('guardia'));
              return (
                <View key={c.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.nombreRow}>
                        <Text style={styles.nombreClinica}>{c.nombre}</Text>
                      </View>
                      {c.medico ? (
                        <Text style={styles.medicoText}>A cargo: {c.medico}</Text>
                      ) : null}
                    </View>

                    {esGuardia ? (
                      <View style={styles.badgeGuardia}>
                        <MaterialIcons name="flash-on" size={14} color={colors.urgenteText} />
                        <Text style={styles.badgeGuardiaText}>24 HS</Text>
                      </View>
                    ) : (
                      <View style={styles.badgeTipo}>
                        <Text style={styles.badgeTipoText}>
                          {c.tipo === 'quirurgico' ? 'Cirugía' : 'Consultorio'}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.ubicacionRow}>
                    <MaterialIcons name="place" size={18} color={colors.textSubtle} />
                    <Text style={styles.direccionText}>
                      {c.direccion} · {c.barrio}
                    </Text>
                    {c.distancia ? (
                      <Text style={styles.distanciaBadge}>({c.distancia})</Text>
                    ) : null}
                  </View>

                  {c.detalle ? (
                    <View style={styles.detalleBox}>
                      <Text style={styles.detalleText}>{c.detalle}</Text>
                    </View>
                  ) : null}

                  {/* Estado y horario */}
                  <View style={styles.estadoRow}>
                    <View style={[styles.puntoEstado, { backgroundColor: c.abierto ? colors.aldia : colors.urgente }]} />
                    <Text style={[styles.estadoTexto, { color: c.abierto ? colors.aldia : colors.urgente }]}>
                      {c.abierto ? 'Atendiendo actualmente' : 'Cerrado por horario'}
                    </Text>
                  </View>

                  {/* Acciones MD3 (Touch Targets >= 48dp) */}
                  <View style={styles.acciones}>
                    <Pressable
                      style={styles.btnAccionSecundario}
                      onPress={() => llamar(c)}
                      accessibilityLabel={`Llamar a ${c.nombre}`}
                    >
                      <MaterialIcons name="call" size={18} color={colors.primary} />
                      <Text style={styles.btnAccionSecundarioText}>Llamar</Text>
                    </Pressable>

                    <Pressable
                      style={styles.btnAccionSecundario}
                      onPress={() => abrirMapa(c)}
                      accessibilityLabel={`Cómo llegar a ${c.nombre}`}
                    >
                      <MaterialIcons name="directions" size={18} color={colors.primary} />
                      <Text style={styles.btnAccionSecundarioText}>Cómo llegar</Text>
                    </Pressable>

                    <Pressable
                      style={styles.btnAccionPrimario}
                      onPress={() => navigation?.navigate?.('AgendarTurno')}
                      accessibilityLabel="Agendar turno en esta clínica"
                    >
                      <MaterialIcons name="event" size={18} color={colors.onPrimary} />
                      <Text style={styles.btnAccionPrimarioText}>Turno</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  searchContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },

  chipsScroll: { gap: 8, paddingBottom: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipActivoUrgente: {
    backgroundColor: colors.urgenteBg,
    borderColor: colors.urgente,
  },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  chipTextActivo: { color: colors.onPrimary, fontFamily: fonts.bold },
  chipTextUrgente: { color: colors.urgenteText, fontFamily: fonts.bold },

  content: { padding: 16, gap: 14 },

  bannerEmergencia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff7ed',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  bannerIcono: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitulo: { fontFamily: fonts.bold, fontSize: 14, color: '#9a3412' },
  bannerTexto: { fontFamily: fonts.regular, fontSize: 12, color: '#7c2d12', marginTop: 2, lineHeight: 16 },

  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  nombreRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nombreClinica: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  medicoText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted, marginTop: 2 },

  badgeGuardia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.urgenteBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeGuardiaText: { fontFamily: fonts.bold, fontSize: 11, color: colors.urgenteText },

  badgeTipo: {
    backgroundColor: colors.surfaceChip,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeTipoText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textMuted },

  ubicacionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  direccionText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, flex: 1 },
  distanciaBadge: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primary },

  detalleBox: {
    backgroundColor: colors.surfaceCard,
    padding: 10,
    borderRadius: 10,
  },
  detalleText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, lineHeight: 16 },

  estadoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  puntoEstado: { width: 8, height: 8, borderRadius: 4 },
  estadoTexto: { fontFamily: fonts.semibold, fontSize: 12 },

  acciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  btnAccionSecundario: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    backgroundColor: colors.surfaceChip,
  },
  btnAccionSecundarioText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },

  btnAccionPrimario: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  btnAccionPrimarioText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.onPrimary },

  vacio: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  vacioTitulo: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  vacioSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSubtle, textAlign: 'center' },
});
