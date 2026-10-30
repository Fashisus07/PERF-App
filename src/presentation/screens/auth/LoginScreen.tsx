import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authRepository } from '../../../di/container';
import { useOnline } from '../../hooks/useOnline';
import { colors, fonts } from '../../theme';

type Props = {
  onLogin: () => void;
  onRegistro: () => void;
  onRecuperarClave?: () => void;
};

const SHADOW_SM = {
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 2,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
} as const;

export function LoginScreen({ onLogin, onRegistro, onRecuperarClave }: Props) {
  const { top, bottom } = useSafeAreaInsets();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [recordar, setRecordar] = useState(true);
  const [iniciando, setIniciando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const online = useOnline();

  useEffect(() => {
    // Pre-cargar usuario recordado si existe
    AsyncStorage.getItem('perf.recordar_usuario').then((user) => {
      if (user) setUsuario(user);
    });
  }, []);

  const handleLogin = async () => {
    setErrorMsg(null);
    if (!usuario.trim()) {
      setErrorMsg('Ingresá tu usuario o correo electrónico.');
      return;
    }
    if (!clave.trim()) {
      setErrorMsg('Ingresá tu contraseña de guardia.');
      return;
    }

    setIniciando(true);
    try {
      await authRepository.iniciarSesion(usuario, clave);
      // "Recordar usuario" solo guarda el correo para precompletarlo; la sesión la mantiene Supabase.
      if (recordar) await AsyncStorage.setItem('perf.recordar_usuario', usuario.trim().toLowerCase());
      else await AsyncStorage.removeItem('perf.recordar_usuario');
      onLogin();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error al iniciar sesión. Verificá tus credenciales.');
    } finally {
      setIniciando(false);
    }
  };

  const handleBiometria = async () => {
    setErrorMsg(null);
    setIniciando(true);
    try {
      // Ingreso rápido: solo reutiliza una sesión ya iniciada con correo y contraseña.
      const actual = await authRepository.obtenerVoluntarioActual();
      if (!actual) {
        throw new Error('Primero iniciá sesión con tu correo y contraseña.');
      }
      onLogin();
    } catch (e: any) {
      setErrorMsg(e?.message || 'No se pudo verificar la huella.');
    } finally {
      setIniciando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: top + 16, paddingBottom: bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.brandRow}>
            <Image source={require('../../../../assets/images/logo.png')} style={styles.brandLogo} />
            <View>
              <Text style={styles.brandTitle}>PERF MÓVIL</Text>
              <Text style={styles.text}>Red de Rescate Felino · Buenos Aires</Text>
            </View>
          </View>
          <View style={styles.welcomeRow}>
            <View style={styles.welcomeText}>
              <Text style={styles.textDark}>¡Hola de nuevo!</Text>
              <Text style={styles.text}>Accedé para sincronizar tus rescates.</Text>
            </View>
            <View style={styles.photoBox}>
              <Image source={require('../../../../assets/images/login-gato.jpg')} style={styles.photo} />
            </View>
          </View>
        </View>

        {errorMsg ? (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={20} color={colors.urgente} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.textDark}>Usuario o correo</Text>
              <Text style={styles.text}>Email o DNI</Text>
            </View>
            <View>
              <TextInput
                style={styles.input}
                value={usuario}
                onChangeText={(t) => {
                  setUsuario(t);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="ej: voluntario@perfelino.org"
                placeholderTextColor={colors.placeholderField}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              <MaterialIcons name="mail-outline" size={20} color={colors.text} style={styles.iconLeft} />
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.textDark}>Contraseña</Text>
              <Pressable style={styles.linkBtn} hitSlop={8}>
                <Text style={styles.link}>¿Olvidaste tu clave?</Text>
              </Pressable>
            </View>
            <View>
              <TextInput
                style={styles.input}
                value={clave}
                onChangeText={(t) => {
                  setClave(t);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Tu contraseña de guardia"
                placeholderTextColor={colors.placeholderField}
                secureTextEntry={!verClave}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <MaterialIcons name="lock-outline" size={20} color={colors.text} style={styles.iconLeft} />
              <Pressable
                style={styles.eyeBtn}
                onPress={() => setVerClave((v) => !v)}
                accessibilityLabel="Mostrar u ocultar contraseña"
              >
                <MaterialIcons
                  name={verClave ? 'visibility-off' : 'visibility'}
                  size={22}
                  color={colors.text}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.recordarRow}>
            <Pressable style={styles.checkRow} onPress={() => setRecordar((r) => !r)}>
              <View style={[styles.checkbox, !recordar && styles.checkboxOff]}>
                {recordar && <MaterialIcons name="check" size={16} color={colors.onPrimary} />}
              </View>
              <Text style={styles.textDark}>Recordar usuario</Text>
            </Pressable>

            {onRecuperarClave && (
              <Pressable onPress={onRecuperarClave} hitSlop={8}>
                <Text style={styles.olvidoText}>¿Olvidaste tu clave?</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={handleLogin} disabled={iniciando}>
              {iniciando ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <>
                  <MaterialIcons name="login" size={18} color={colors.onPrimary} />
                  <Text style={[styles.textDark, { color: colors.onPrimary }]}>Iniciar sesión</Text>
                </>
              )}
            </Pressable>
            <Pressable style={[styles.btn, styles.btnSecondary]} onPress={handleBiometria} disabled={iniciando}>
              <MaterialIcons name="fingerprint" size={22} color={colors.brand} />
              <Text style={styles.textDark}>Ingresar con huella digital</Text>
            </Pressable>
          </View>
        </View>

        {!online && (
          <View style={styles.offlineChip}>
            <MaterialIcons name="cloud-off" size={14} color={colors.atencion} />
            <Text style={styles.chipText}>Modo offline · Guardando en el teléfono</Text>
          </View>
        )}

        <View style={styles.registroCard}>
          <Text style={[styles.text, styles.center]}>{'¿Todavía no sos parte del equipo de\nrescate?'}</Text>
          <Pressable style={styles.registroBtn} onPress={onRegistro}>
            <Text style={styles.link}>Registrate como voluntario</Text>
            <MaterialIcons name="arrow-forward" size={14} color={colors.primary} />
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16 },
  text: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.textMuted },
  textDark: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.text },
  center: { textAlign: 'center' },

  hero: { backgroundColor: colors.surfaceCard, borderRadius: 12, padding: 16, gap: 8, marginBottom: 16, ...SHADOW_SM },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandLogo: { width: 40, height: 40 },
  brandTitle: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  welcomeText: { flex: 1, gap: 4 },
  photoBox: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    ...SHADOW_SM,
  },
  photo: { position: 'absolute', top: 0, height: 64, width: 64 * 1.8351, left: -64 * 0.4176 },

  form: { gap: 16 },
  field: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: {
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingLeft: 48,
    paddingRight: 48,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    ...SHADOW_SM,
  },
  iconLeft: { position: 'absolute', left: 16, top: 18 },
  eyeBtn: {
    position: 'absolute',
    right: 4,
    top: 6,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBtn: { height: 32, paddingHorizontal: 4, justifyContent: 'center' },
  link: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.primary, textAlign: 'center' },
  recordarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  olvidoText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 2.5,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOff: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.textMuted },

  actions: { gap: 8, paddingTop: 8 },
  btn: {
    height: 56,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnPrimary: {
    backgroundColor: colors.brand,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  btnSecondary: { backgroundColor: colors.surfaceChip, gap: 10, ...SHADOW_SM },

  offlineChip: {
    alignSelf: 'stretch',
    marginTop: 24,
    marginHorizontal: 25,
    paddingHorizontal: 13,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.borderChip,
    backgroundColor: colors.surfaceChip,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  chipText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.textMuted },

  registroCard: {
    marginTop: 24,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  registroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.urgenteBg,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.urgente,
  },
});
