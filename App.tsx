import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ACCION_LLAMAR, configurarNotificaciones } from './src/data/local/RecordatoriosNotificaciones';
import { AppNavigator } from './src/presentation/navigation/AppNavigator';

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  // Notificaciones de turnos: configuración inicial y botón "Llamar al centro".
  useEffect(() => {
    configurarNotificaciones();
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const telefono = r.notification.request.content.data?.telefono;
      if (r.actionIdentifier === ACCION_LLAMAR && typeof telefono === 'string') Linking.openURL(`tel:${telefono}`);
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
