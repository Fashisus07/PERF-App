import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

// Candado de la app: al abrirla con una sesión guardada pide la huella, o el PIN/patrón del celular.
// No se guarda ninguna contraseña: lo que se recuerda es la sesión, y el candado la protege.

const CLAVE = 'perf.candado.activado';

/** El celular tiene huella, rostro, PIN o patrón configurado. */
export async function celularTieneBloqueo(): Promise<boolean> {
  try {
    const nivel = await LocalAuthentication.getEnrolledLevelAsync();
    return nivel !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

/** Viene activado: solo se apaga si el voluntario lo desactiva en Ajustes. */
export async function candadoActivado(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CLAVE)) !== 'no';
  } catch {
    return true;
  }
}

export async function guardarCandado(activo: boolean): Promise<void> {
  await AsyncStorage.setItem(CLAVE, activo ? 'si' : 'no');
}

/** Hay que pedir el desbloqueo: está activado y el celular tiene con qué verificar. */
export async function candadoRequerido(): Promise<boolean> {
  return (await candadoActivado()) && (await celularTieneBloqueo());
}

/** Muestra el pedido de huella (o PIN). Devuelve true si el voluntario lo pasó. */
export async function pedirDesbloqueo(): Promise<boolean> {
  const r = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Desbloqueá PERF Móvil',
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false, // permite el PIN o patrón si la huella falla
  });
  return r.success;
}
