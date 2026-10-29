import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAutoSync } from '../hooks/useAutoSync';
import { colors, fonts } from '../theme';

export function AppHeader({ subtitle, onSettings }: { subtitle: string; onSettings?: () => void }) {
  const { top } = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { online, sincronizando } = useAutoSync();

  // Por defecto el engranaje abre Ajustes en todas las pantallas principales.
  const abrirAjustes = onSettings ?? (() => navigation.navigate('Ajustes'));
  return (
    <View style={[styles.header, { paddingTop: top }]}>
      <View style={styles.row}>
        <View style={styles.brand}>
          <Image source={require('../../../assets/images/logo.png')} style={styles.logo} />
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.title}>PERF Móvil</Text>
              {!online ? (
                <Pressable
                  style={styles.offPill}
                  onPress={() => navigation.navigate('ColaSincronizacion')}
                  accessibilityLabel="Ver cola de sincronización offline"
                >
                  <MaterialIcons name="cloud-off" size={12} color={colors.atencion} />
                  <Text style={styles.offPillText}>Offline</Text>
                </Pressable>
              ) : sincronizando ? (
                <Pressable
                  style={styles.syncPill}
                  onPress={() => navigation.navigate('ColaSincronizacion')}
                  accessibilityLabel="Sincronizando datos"
                >
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.syncPillText}>Sincronizando</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.iconBtn} onPress={abrirAjustes} accessibilityLabel="Ajustes">
            <MaterialIcons name="settings" size={24} color={colors.text} />
          </Pressable>
          <Image source={require('../../../assets/images/avatar.jpg')} style={styles.avatar} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.surfaceHeader, borderBottomWidth: 1, borderBottomColor: colors.border },
  row: { height: 64, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 32, height: 32 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary, lineHeight: 26 },
  subtitle: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textMuted },
  offPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.atencionBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  offPillText: { fontFamily: fonts.bold, fontSize: 10, color: colors.atencion },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  syncPillText: { fontFamily: fonts.bold, fontSize: 10, color: colors.primary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { width: 48, height: 48, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 32, height: 32, borderRadius: 9999 },
});

