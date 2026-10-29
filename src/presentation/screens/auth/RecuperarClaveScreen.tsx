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
};

export function RecuperarClaveScreen({ navigation }: Props) {
  const { bottom } = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRecuperar = async () => {
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Ingresá una dirección de correo válida.');
      return;
    }
    setEnviando(true);
    setErrorMsg(null);
    try {
      await authRepository.recuperarClave(email);
      setEnviado(true);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error al procesar la solicitud.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StackHeader titulo="Recuperar Contraseña" onBack={() => navigation?.goBack?.()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="lock-reset" size={36} color={colors.primary} />
          </View>
          <Text style={styles.titulo}>¿Olvidaste tu contraseña?</Text>
          <Text style={styles.subtitulo}>
            Ingresá tu correo electrónico de voluntario y te enviaremos las instrucciones de restablecimiento.
          </Text>
        </View>

        {enviado ? (
          <View style={styles.exitoCard}>
            <View style={styles.exitoIcono}>
              <MaterialIcons name="mark-email-read" size={32} color={colors.aldia} />
            </View>
            <Text style={styles.exitoTitulo}>¡Correo enviado con éxito!</Text>
            <Text style={styles.exitoTexto}>
              Revisá la bandeja de entrada de <Text style={{ fontFamily: fonts.bold }}>{email}</Text>. Si no lo ves en unos minutos, chequeá tu carpeta de spam o correo no deseado.
            </Text>
            <Pressable
              style={styles.btnVolverLogin}
              onPress={() => navigation?.goBack?.()}
            >
              <MaterialIcons name="arrow-back" size={18} color={colors.onPrimary} />
              <Text style={styles.btnVolverLoginText}>Volver a Iniciar Sesión</Text>
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
              <Text style={styles.label}>Correo electrónico</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="mail-outline" size={20} color={colors.textSubtle} style={styles.iconInput} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="ej: voluntario@perfelino.org"
                  placeholderTextColor={colors.placeholderField}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.infoBox}>
              <MaterialIcons name="shield" size={18} color={colors.primary} />
              <Text style={styles.infoText}>
                Por seguridad de la red de rescate felino, el enlace expira en 60 minutos.
              </Text>
            </View>

            <Pressable
              style={[styles.btnEnviar, enviando && styles.btnDeshabilitado]}
              onPress={handleRecuperar}
              disabled={enviando}
            >
              {enviando ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <>
                  <MaterialIcons name="send" size={18} color={colors.onPrimary} />
                  <Text style={styles.btnEnviarText}>Enviar instrucciones</Text>
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
    paddingHorizontal: 10,
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

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceCard,
    padding: 12,
    borderRadius: 12,
  },
  infoText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 16,
  },

  btnEnviar: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  btnDeshabilitado: { opacity: 0.7 },
  btnEnviarText: { fontFamily: fonts.bold, fontSize: 15, color: colors.onPrimary },

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
    width: 64,
    height: 64,
    borderRadius: 32,
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
  btnVolverLogin: {
    backgroundColor: colors.primary,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  btnVolverLoginText: { fontFamily: fonts.bold, fontSize: 14, color: colors.onPrimary },
});
