import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { AppHeader } from './AppHeader';

export function PlaceholderScreen({ titulo }: { titulo: string }) {
  return (
    <View style={styles.screen}>
      <AppHeader subtitle={titulo} />
      <View style={styles.body}>
        <Text style={styles.text}>{titulo} — pendiente de implementar</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.semibold, color: colors.textMuted },
});
