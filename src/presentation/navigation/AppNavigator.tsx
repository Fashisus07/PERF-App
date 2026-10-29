import { MaterialIcons } from '@expo/vector-icons';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AjustesScreen } from '../screens/ajustes/AjustesScreen';
import { ColaSincronizacionScreen } from '../screens/ajustes/ColaSincronizacionScreen';
import { PerfilVoluntarioScreen } from '../screens/ajustes/PerfilVoluntarioScreen';
import { ArchivoScreen } from '../screens/archivo/ArchivoScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RecuperarClaveScreen } from '../screens/auth/RecuperarClaveScreen';
import { RegistroScreen } from '../screens/auth/RegistroScreen';
import { DetalleCasoScreen } from '../screens/detalle/DetalleCasoScreen';
import { EditarSanidadScreen } from '../screens/detalle/EditarSanidadScreen';
import { NuevaNotaHistorialScreen } from '../screens/detalle/NuevaNotaHistorialScreen';
import { CambioEstadoScreen } from '../screens/estado/CambioEstadoScreen';
import { ConfirmacionCambioScreen } from '../screens/estado/ConfirmacionCambioScreen';
import { ErrorGuardadoScreen } from '../screens/rescate/ErrorGuardadoScreen';
import { NuevoRescateScreen } from '../screens/rescate/NuevoRescateScreen';
import { RescateGuardadoScreen } from '../screens/rescate/RescateGuardadoScreen';
import { CasosScreen } from '../screens/casos/CasosScreen';
import { AgendarTurnoScreen } from '../screens/turnos/AgendarTurnoScreen';
import { DirectorioClinicasScreen } from '../screens/turnos/DirectorioClinicasScreen';
import { TurnoAgendadoScreen } from '../screens/turnos/TurnoAgendadoScreen';
import { TurnoNoDisponibleScreen } from '../screens/turnos/TurnoNoDisponibleScreen';
import { TurnosScreen } from '../screens/turnos/TurnosScreen';
import { colors, fonts } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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

function MainTabs() {
  return (
    <Tab.Navigator tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Casos" component={CasosScreen} />
      <Tab.Screen name="Turnos" component={TurnosScreen} />
      <Tab.Screen name="Archivo" component={ArchivoScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login">
          {({ navigation }) => (
            <LoginScreen
              onLogin={() => navigation.reset({ index: 0, routes: [{ name: 'Main' }] })}
              onRegistro={() => navigation.navigate('Registro')}
              onRecuperarClave={() => navigation.navigate('RecuperarClave')}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Registro">
          {({ navigation }) => (
            <RegistroScreen
              onRegistrar={() => navigation.reset({ index: 0, routes: [{ name: 'Main' }] })}
              onLogin={() => navigation.goBack()}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="RecuperarClave" component={RecuperarClaveScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Ajustes" component={AjustesScreen} />
        <Stack.Screen name="PerfilVoluntario" component={PerfilVoluntarioScreen} />
        <Stack.Screen name="ColaSincronizacion" component={ColaSincronizacionScreen} />
        <Stack.Screen name="DetalleCaso" component={DetalleCasoScreen} />
        <Stack.Screen name="EditarSanidad" component={EditarSanidadScreen} />
        <Stack.Screen name="NuevaNotaHistorial" component={NuevaNotaHistorialScreen} />
        <Stack.Screen name="NuevoRescate" component={NuevoRescateScreen} />
        <Stack.Screen name="RescateGuardado" component={RescateGuardadoScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="ErrorGuardado" component={ErrorGuardadoScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="DirectorioClinicas" component={DirectorioClinicasScreen} />
        <Stack.Screen name="AgendarTurno" component={AgendarTurnoScreen} />
        <Stack.Screen name="TurnoAgendado" component={TurnoAgendadoScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="TurnoNoDisponible" component={TurnoNoDisponibleScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="CambioEstado" component={CambioEstadoScreen} />
        <Stack.Screen name="ConfirmacionCambio" component={ConfirmacionCambioScreen} options={{ gestureEnabled: false }} />
      </Stack.Navigator>
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
