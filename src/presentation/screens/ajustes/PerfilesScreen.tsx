import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authRepository } from '../../../di/container';
import { esAdministrador, ETIQUETA_ROL, Voluntario, zonasDesdeTexto } from '../../../domain/models/Ajustes';
import { AvatarIniciales } from '../../components/AvatarIniciales';
import { StackHeader } from '../../components/StackHeader';
import { colors, fonts } from '../../theme';

type Props = { navigation?: any };

/** Lista de los voluntarios aprobados de la red, con su rol y las zonas que cubren. */
export function PerfilesScreen({ navigation }: Props) {
  const { bottom } = useSafeAreaInsets();
  const [lista, setLista] = useState<Voluntario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const cargar = () => {
    setCargando(true);
    setError(null);
    authRepository
      .listarVoluntarios()
      .then(setLista)
      .catch((e) => setError(e?.message || 'No se pudieron cargar los perfiles.'))
      .finally(() => setCargando(false));
  };
  useEffect(cargar, []);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter(
      (v) => v.nombre.toLowerCase().includes(q) || (v.zona ?? '').toLowerCase().includes(q)
    );
  }, [lista, busqueda]);

  return (
    <View style={styles.screen}>
      <StackHeader titulo="Voluntarios" onBack={() => navigation?.goBack?.()} />

      {cargando ? (
        <View style={styles.centro}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centro}>
          <MaterialIcons name="cloud-off" size={36} color={colors.textMuted} />
          <Text style={styles.vacioTexto}>{error}</Text>
          <Pressable style={styles.reintentar} onPress={cargar}>
            <Text style={styles.reintentarTexto}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={visibles}
          keyExtractor={(v) => v.id ?? v.email ?? v.nombre}
          contentContainerStyle={[styles.lista, { paddingBottom: bottom + 24 }]}
          ListHeaderComponent={
            <View style={styles.search}>
              <MaterialIcons name="search" size={22} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre o zona..."
                placeholderTextColor={colors.placeholderField}
                value={busqueda}
                onChangeText={setBusqueda}
              />
            </View>
          }
          ListEmptyComponent={<Text style={styles.vacioTexto}>No hay voluntarios que coincidan.</Text>}
          renderItem={({ item }) => {
            const rol = item.rol ?? 'voluntario';
            const zonas = zonasDesdeTexto(item.zona);
            return (
              <Pressable
                style={styles.fila}
                onPress={() => navigation?.navigate?.('PerfilDetalle', { voluntarioId: item.id })}
                accessibilityLabel={`Ver perfil de ${item.nombre}`}
              >
                <AvatarIniciales nombre={item.nombre} rol={rol} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.nombre} numberOfLines={1}>{item.nombre}</Text>
                  <Text style={styles.zonas} numberOfLines={1}>
                    {zonas.length ? zonas.join(' · ') : 'Sin zonas cargadas'}
                  </Text>
                </View>
                <View style={[styles.rol, esAdministrador(rol) && styles.rolAdmin]}>
                  <Text style={[styles.rolTexto, esAdministrador(rol) && { color: colors.onPrimary }]}>
                    {ETIQUETA_ROL[rol]}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={colors.textSubtle} />
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
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  lista: { padding: 16, gap: 10 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  searchInput: { flex: 1, height: 48, fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    minHeight: 72,
  },
  nombre: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  zonas: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  rol: { backgroundColor: colors.surfaceChip, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  rolAdmin: { backgroundColor: colors.primary },
  rolTexto: { fontFamily: fonts.semibold, fontSize: 11, color: colors.primary },
  vacioTexto: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  reintentar: { backgroundColor: colors.primary, paddingHorizontal: 20, height: 44, borderRadius: 22, justifyContent: 'center' },
  reintentarTexto: { fontFamily: fonts.semibold, fontSize: 14, color: colors.onPrimary },
});
