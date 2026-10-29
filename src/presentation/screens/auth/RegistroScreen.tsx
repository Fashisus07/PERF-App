import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
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
import { colors, fonts } from '../../theme';

type Props = {
  onRegistrar: () => void;
  onLogin: () => void;
};

type Icono = keyof typeof MaterialIcons.glyphMap;

const ZONAS: { nombre: string; icono: Icono }[] = [
  { nombre: 'Balvanera', icono: 'location-on' },
  { nombre: 'Caballito', icono: 'location-on' },
  { nombre: 'Almagro', icono: 'location-on' },
  { nombre: 'Palermo', icono: 'location-on' },
  { nombre: 'San Telmo', icono: 'location-on' },
  { nombre: 'Otra zona', icono: 'near-me' },
];

const RECURSOS: { id: string; icono: Icono; titulo: string; detalle: string }[] = [
  { id: 'canil', icono: 'home', titulo: 'Tengo canil propio', detalle: 'Rígido o jaula trampa reglamentaria' },
  { id: 'movil', icono: 'directions-car', titulo: 'Móvil propio / Auto', detalle: 'Disponibilidad para traslados y veterinarias' },
  { id: 'transito', icono: 'location-on', titulo: 'Tránsito disponible', detalle: 'Habitación de aislamiento / cuarentena' },
];

const DIGITOS_TELEFONO = 10;

function formatearTelefono(digitos: string) {
  const d = digitos.slice(0, DIGITOS_TELEFONO);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `${d.slice(0, 2)} ${d.slice(2)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 6)}-${d.slice(6)}`;
}

const SHADOW_XS = {
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 1,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
} as const;

function Campo({
  label,
  nota,
  notaColor,
  icono,
  derecha,
  error,
  ...input
}: {
  label: string;
  nota?: string;
  notaColor?: string;
  icono: Icono;
  derecha?: React.ReactNode;
  error?: string;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {nota ? <Text style={[styles.nota, notaColor ? { color: notaColor, fontFamily: fonts.bold, letterSpacing: 0.56 } : null]}>{nota}</Text> : null}
      </View>
      <View>
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          placeholderTextColor={colors.placeholderInput}
          autoCapitalize="none"
          autoCorrect={false}
          {...input}
        />
        <MaterialIcons name={icono} size={20} color={colors.textMuted} style={styles.iconLeft} />
        {derecha}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function Seccion({ icono, titulo, children }: { icono: Icono; titulo: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <MaterialIcons name={icono} size={20} color={colors.primary} />
        <Text style={styles.cardTitle}>{titulo}</Text>
      </View>
      {children}
    </View>
  );
}

export function RegistroScreen({ onRegistrar, onLogin }: Props) {
  const { top, bottom } = useSafeAreaInsets();
  const [nombre, setNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState(''); // solo dígitos
  const [zona, setZona] = useState('Balvanera');
  const [recursos, setRecursos] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [acepta, setAcepta] = useState(false);
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const telefonoValido = whatsapp.length === DIGITOS_TELEFONO;
  const telefonoIncompleto = whatsapp.length > 0 && !telefonoValido;
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const nombreValido = nombre.trim().length > 0;
  const claveValida = clave.length >= 6;
  const completo = nombreValido && telefonoValido && emailValido && claveValida && acepta;

  const intentarRegistrar = async () => {
    setErrorGeneral(null);
    if (!completo) {
      setIntento(true);
      return;
    }
    setGuardando(true);
    try {
      await authRepository.registrar({
        nombre: nombre.trim(),
        email: email.trim(),
        telefono: whatsapp.trim(),
        zona,
        clave,
        recursos,
      });
      onRegistrar();
    } catch (e: any) {
      setErrorGeneral(e?.message || 'Error al crear la cuenta. Intente nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  const toggleRecurso = (id: string) =>
    setRecursos((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: top + 16, paddingBottom: bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <Image source={require('../../../../assets/images/logo.png')} style={styles.heroLogo} />
          <View style={styles.heroBody}>
            <View style={styles.heroTags}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>PERF RED FELINA</Text>
              </View>
              <View style={styles.dot} />
              <Text style={styles.zonaText}>CABA · AMBA</Text>
            </View>
            <Text style={styles.heroTitle}>Sumate a la red de rescate</Text>
            <Text style={styles.heroText}>
              Creá tu cuenta de voluntario de campo para registrar rescates y coordinar tránsitos.
            </Text>
          </View>
        </View>

        <View style={styles.triage}>
          <View style={styles.triagePhotoBox}>
            <Image source={require('../../../../assets/images/registro-gato.jpg')} style={styles.triagePhoto} />
          </View>
          <View style={styles.triageText}>
            <Text style={styles.triageTitle}>Triage y logística inmediata</Text>
            <Text style={styles.triageDetail}>Alertas según tu radio geográfico y recursos activos.</Text>
          </View>
        </View>

        <View style={styles.form}>
          <Seccion icono="badge" titulo="Datos de contacto de guardia">
            <Campo
              label="Nombre y apellido"
              nota="Obligatorio"
              icono="person"
              value={nombre}
              onChangeText={setNombre}
              placeholder="ej: Mariana Gómez"
              autoCapitalize="words"
              error={intento && !nombreValido ? 'Ingresá tu nombre y apellido.' : undefined}
            />
            <View>
              <Campo
                label="WhatsApp de guardia"
                nota="Alertas críticas"
                notaColor={colors.atencion}
                icono="smartphone"
                value={formatearTelefono(whatsapp)}
                onChangeText={(t) => setWhatsapp(t.replace(/\D/g, '').slice(0, DIGITOS_TELEFONO))}
                placeholder="ej: 11 5555-1234"
                keyboardType="number-pad"
                maxLength={12}
              />
              {telefonoIncompleto || (intento && !telefonoValido) ? (
                <Text style={[styles.ayuda, styles.ayudaError]}>
                  Ingresá los 10 dígitos: código de área + número, sin 0 ni 15.
                </Text>
              ) : (
                <Text style={styles.ayuda}>Te contactaremos sólo ante urgencias y derivaciones activas.</Text>
              )}
            </View>
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Zona habitual de acción</Text>
                <Text style={styles.nota}>Seleccioná una</Text>
              </View>
              <View style={styles.chips}>
                {ZONAS.map((z) => {
                  const activa = zona === z.nombre;
                  return (
                    <Pressable
                      key={z.nombre}
                      style={[styles.chip, activa && styles.chipActive]}
                      onPress={() => setZona(z.nombre)}
                    >
                      <MaterialIcons name={z.icono} size={14} color={activa ? colors.onPrimary : colors.textMuted} />
                      <Text style={[styles.chipText, activa && { color: colors.onPrimary }]}>{z.nombre}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Seccion>

          <Seccion icono="inventory-2" titulo="Recursos y disponibilidad rápida">
            <Text style={styles.nota}>
              Podés sumar más de una opción. Ayuda a definir tu rol en rescates de calle:
            </Text>
            <View style={styles.recursos}>
              {RECURSOS.map((r) => {
                const marcado = recursos.includes(r.id);
                return (
                  <Pressable key={r.id} style={styles.recurso} onPress={() => toggleRecurso(r.id)}>
                    <View style={[styles.checkbox, marcado && styles.checkboxOn]}>
                      {marcado && <MaterialIcons name="check" size={16} color={colors.onPrimary} />}
                    </View>
                    <MaterialIcons name={r.icono} size={18} color={colors.primary} />
                    <View style={styles.recursoText}>
                      <Text style={styles.recursoTitulo}>{r.titulo}</Text>
                      <Text style={styles.nota}>{r.detalle}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Seccion>

          <Seccion icono="lock" titulo="Credenciales de acceso">
            <Campo
              label="Correo electrónico"
              icono="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              keyboardType="email-address"
              error={intento && !emailValido ? 'Ingresá un correo válido, por ejemplo tu@email.com.' : undefined}
            />
            <Campo
              label="Contraseña"
              icono="vpn-key"
              value={clave}
              onChangeText={setClave}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry={!verClave}
              error={intento && !claveValida ? 'La contraseña debe tener al menos 6 caracteres.' : undefined}
              derecha={
                <Pressable
                  style={styles.eyeBtn}
                  onPress={() => setVerClave((v) => !v)}
                  accessibilityLabel="Mostrar contraseña"
                >
                  <MaterialIcons name={verClave ? 'visibility-off' : 'visibility'} size={20} color={colors.textMuted} />
                </Pressable>
              }
            />
          </Seccion>

          <Pressable
            style={[styles.terminos, intento && !acepta && styles.terminosError]}
            onPress={() => setAcepta((a) => !a)}
          >
            <View style={[styles.checkbox, styles.checkboxLg, acepta && styles.checkboxOn]}>
              {acepta && <MaterialIcons name="check" size={18} color={colors.onPrimary} />}
            </View>
            <Text style={styles.terminosText}>
              Acepto las <Text style={styles.terminosLink}>pautas de cuidado y bienestar animal</Text> de PERF
              Móvil, el protocolo ético de tránsito responsable y el resguardo de datos en intervenciones de
              campo.
            </Text>
          </Pressable>
          {intento && !acepta ? (
            <Text style={[styles.error, { marginTop: -8 }]}>Tenés que aceptar los términos para crear la cuenta.</Text>
          ) : null}

          {errorGeneral ? (
            <View style={styles.errorBanner}>
              <MaterialIcons name="error-outline" size={20} color={colors.urgente} />
              <Text style={styles.errorBannerText}>{errorGeneral}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable style={styles.cta} onPress={intentarRegistrar} disabled={guardando}>
              {guardando ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <>
                  <MaterialIcons name="person-add" size={18} color={colors.onPrimary} />
                  <Text style={styles.ctaText}>Crear cuenta de voluntario</Text>
                </>
              )}
            </Pressable>
            <View style={styles.loginRow}>
              <Text style={styles.loginText}>¿Ya sos voluntario registrado?</Text>
              <Pressable onPress={onLogin} hitSlop={8}>
                <Text style={styles.loginLink}>Iniciar sesión</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16 },

  hero: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 8,
    overflow: 'hidden',
    marginBottom: 16,
    ...SHADOW_XS,
  },
  heroGlow: {
    position: 'absolute',
    right: -24,
    bottom: -24,
    width: 112,
    height: 112,
    borderRadius: 9999,
    backgroundColor: 'rgba(156,242,232,0.2)',
  },
  heroLogo: { width: 48, height: 48 },
  heroBody: { flex: 1, gap: 4 },
  heroTags: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  tag: { backgroundColor: 'rgba(0,92,85,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  tagText: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.35, color: colors.primary },
  dot: { width: 8, height: 8, borderRadius: 9999, backgroundColor: colors.aldia },
  zonaText: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.56, color: colors.textMuted },
  heroTitle: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 27.5, color: colors.text },
  heroText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19.25, letterSpacing: 0.14, color: colors.textMuted },

  triage: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    ...SHADOW_XS,
  },
  triagePhotoBox: { width: 56, height: 56, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  triagePhoto: { position: 'absolute', top: 0, height: 56, width: 56 * 1.8351, left: -56 * 0.4176 },
  triageText: { flex: 1 },
  triageTitle: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, letterSpacing: 0.28, color: colors.primary },
  triageDetail: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, letterSpacing: 0.14, color: colors.textMuted },

  form: { gap: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 16, ...SHADOW_XS },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 4 },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, letterSpacing: 0.3, color: colors.text },

  field: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, letterSpacing: 0.28, color: colors.text },
  nota: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, letterSpacing: 0.14, color: colors.textMuted },
  ayuda: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, letterSpacing: 0.14, color: colors.textMuted, paddingLeft: 4, marginTop: 6 },
  ayudaError: { color: colors.urgente },
  error: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, letterSpacing: 0.14, color: colors.urgente, paddingLeft: 4 },
  inputError: { borderWidth: 1.5, borderColor: colors.urgente },
  terminosError: { borderWidth: 1.5, borderColor: colors.urgente },
  input: {
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.surfaceCard,
    paddingLeft: 48,
    paddingRight: 48,
    fontFamily: fonts.regular,
    fontSize: 16,
    letterSpacing: 0.16,
    color: colors.text,
  },
  iconLeft: { position: 'absolute', left: 16, top: 18 },
  eyeBtn: { position: 'absolute', right: 8, top: 8, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 2 },
  chip: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 9999,
    backgroundColor: colors.surfaceChip,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipActive: { backgroundColor: colors.primary, ...SHADOW_XS },
  chipText: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, letterSpacing: 0.28, color: colors.textMuted },

  recursos: { gap: 8 },
  recurso: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recursoText: { flex: 1 },
  recursoTitulo: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, letterSpacing: 0.28, color: colors.text },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 2.5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.checkboxBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLg: { width: 24, height: 24, marginTop: 4 },
  checkboxOn: { backgroundColor: colors.brand, borderColor: colors.brand },

  terminos: { backgroundColor: colors.surfaceCard, borderRadius: 16, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  terminosText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22.75, letterSpacing: 0.14, color: colors.textMuted },
  terminosLink: { fontFamily: fonts.semibold, color: colors.primary },

  actions: { gap: 12, paddingTop: 8 },
  cta: {
    height: 56,
    borderRadius: 9999,
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  ctaText: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, letterSpacing: 0.3, color: colors.onPrimary },
  loginRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  loginText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, letterSpacing: 0.15, color: colors.textMuted },
  loginLink: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.28,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.urgenteBg,
    padding: 12,
    borderRadius: 12,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.urgente,
  },
});
