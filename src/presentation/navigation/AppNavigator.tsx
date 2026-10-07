import { MaterialIcons } from '@expo/vector-icons';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArchivoScreen } from '../screens/archivo/ArchivoScreen';
import { CasosScreen } from '../screens/casos/CasosScreen';
import { TurnosScreen } from '../screens/turnos/TurnosScreen';
import { colors, fonts } from '../theme';

const Tab = createBottomTabNavigator();

const ICONOS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Casos: 'pets',
  Turnos: 'event',
  Archivo: 'folder-special',
};

function TabBar({ state, navigation }: BottomTabBarProps) {
  const { bottom } = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: bottom }]}>
      <View style={styles.row}>
      {state.routes.map((route, i) => {
        const activo = state.index === i;
        const color = activo ? colors.primary : colors.textMuted;
        return (
          <Pressable key={route.key} style={styles.item} onPress={() => navigation.navigate(route.name)}>
            <View style={[styles.pill, activo && styles.pillActive]}>
              <MaterialIcons name={ICONOS[route.name]} size={28} color={color} />
            </View>
            <Text style={[styles.label, { color }]}>{route.name}</Text>
          </Pressable>
        );
      })}
      </View>
    </View>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Casos" component={CasosScreen} />
        <Tab.Screen name="Turnos" component={TurnosScreen} />
        <Tab.Screen name="Archivo" component={ArchivoScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  row: { height: 92, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  pill: { width: 68, height: 38, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: colors.primarySoft },
  label: { fontFamily: fonts.semibold, fontSize: 13 },
});
