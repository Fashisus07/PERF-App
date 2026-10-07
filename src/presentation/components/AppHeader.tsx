import { MaterialIcons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';

export function AppHeader({ subtitle, onSettings }: { subtitle: string; onSettings?: () => void }) {
  const { top } = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: top }]}>
      <View style={styles.row}>
        <View style={styles.brand}>
          <Image source={require('../../../assets/images/logo.png')} style={styles.logo} />
          <View>
            <Text style={styles.title}>PERF Móvil</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.iconBtn} onPress={onSettings} accessibilityLabel="Ajustes">
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
  title: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary, lineHeight: 26 },
  subtitle: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textMuted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { width: 48, height: 48, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 32, height: 32, borderRadius: 9999 },
});
