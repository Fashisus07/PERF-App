import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
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
import { StackHeader } from '../../components/StackHeader';
import { colors, fonts } from '../../theme';

type Props = {
  navigation?: any;
  onExito?: () => void;
};

export function CambiarClaveScreen({ navigation, onExito }: Props) {
  const { bottom } = useSafeAreaInsets();
  const [clave, setClave] = useState('');
  const [repetirClave, setRepetirClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cambiado, setCambiado] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCambiar = async () => {
    setErrorMsg(null);
    const c1 = clave.trim();
    const c2 = repetirClave.trim();

    if (!c1) {
      setErrorMsg('Ingresá una nueva contraseña.');
      return;
    }
    if (c1.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (c1 !== c2) {
      setErrorMsg('Las contraseñas no coinciden. Verificalas.');
      return;
    }

    setGuardando(true);
    try {
      if (authRepository.cambiarClave) {
        await authRepository.cambiarClave(c1);
      }
      setCambiado(true);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error al actualizar la contraseña. Intentá nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  const handleIrInicio = () => {
    if (onExito) {
      onExito();
    } else {
      navigation?.reset?.({ index: 0, routes: [{ name: 'Main' }] });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StackHeader
        titulo="Cambiar Contraseña"
        onBack={() => (navigation?.canGoBack?.() ? navigation?.goBack?.() : handleIrInicio())}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="vpn-key" size={36} color={colors.primary} />
          </View>
          <Text style={styles.titulo}>Creá tu nueva contraseña</Text>
          <Text style={styles.subtitulo}>
            Ingresá tu nueva clave para restablecer el acceso seguro a tu cuenta de voluntario de PERF Móvil.
          </Text>
        </View>

        {cambiado ? (
          <View style={styles.exitoCard}>
            <View style={styles.exitoIcono}>
              <MaterialIcons name="check-circle" size={40} color={colors.aldia} />
            </View>
            <Text style={styles.exitoTitulo}>¡Contraseña actualizada!</Text>
            <Text style={styles.exitoTexto}>
              Tu contraseña fue modificada exitosamente. Ya podés acceder con tus nuevas credenciales.
            </Text>
            <Pressable style={styles.btnContinuar} onPress={handleIrInicio}>
              <MaterialIcons name="login" size={18} color={colors.onPrimary} />
              <Text style={styles.btnContinuarText}>Ingresar a la aplicación</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.formCard}>
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <MaterialIcons name="error-outline" size={20} color={colors.urgente} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Nueva contraseña</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock-outline" size={20} color={colors.textSubtle} style={styles.iconInput} />
                <TextInput
                  style={styles.input}
                  value={clave}
                  onChangeText={(t) => {
                    setClave(t);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={colors.placeholderField}
                  secureTextEntry={!verClave}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
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

            <View style={styles.field}>
              <Text style={styles.label}>Confirmar nueva contraseña</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock" size={20} color={colors.textSubtle} style={styles.iconInput} />
                <TextInput
                  style={styles.input}
                  value={repetirClave}
                  onChangeText={(t) => {
                    setRepetirClave(t);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Repetí tu nueva contraseña"
                  placeholderTextColor={colors.placeholderField}
                  secureTextEntry={!verClave}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <Pressable
              style={[styles.btnGuardar, guardando && styles.btnDeshabilitado]}
              onPress={handleCambiar}
              disabled={guardando}
            >
              {guardando ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <>
                  <MaterialIcons name="check" size={20} color={colors.onPrimary} />
                  <Text style={styles.btnGuardarText}>Guardar nueva contraseña</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 20 },

  hero: { alignItems: 'center', marginTop: 12, gap: 10 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  titulo: { fontFamily: fonts.bold, fontSize: 22, color: colors.text, textAlign: 'center' },
  subtitulo: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },

  formCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },

  field: { gap: 8 },
  label: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 14,
  },
  iconInput: { marginRight: 10 },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  eyeBtn: { padding: 4 },

  btnGuardar: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  btnDeshabilitado: { opacity: 0.7 },
  btnGuardarText: { fontFamily: fonts.bold, fontSize: 15, color: colors.onPrimary },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.urgenteBg,
    padding: 12,
    borderRadius: 12,
  },
  errorText: { fontFamily: fonts.medium, fontSize: 13, color: colors.urgenteText, flex: 1 },

  exitoCard: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 14,
  },
  exitoIcono: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.aldiaBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitoTitulo: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  exitoTexto: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  btnContinuar: {
    backgroundColor: colors.primary,
    height: 50,
    paddingHorizontal: 24,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  btnContinuarText: { fontFamily: fonts.bold, fontSize: 14, color: colors.onPrimary },
});
