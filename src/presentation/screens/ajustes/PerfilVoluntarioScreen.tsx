import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
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
import { Voluntario } from '../../../domain/models/Ajustes';
import { StackHeader } from '../../components/StackHeader';
import { colors, fonts } from '../../theme';

type Props = {
  navigation?: any;
};

const RECURSOS_DISPONIBLES: { key: string; label: string; icono: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: 'canil', label: 'Canil / Transportadora', icono: 'luggage' },
  { key: 'movil', label: 'Vehículo para traslados', icono: 'directions-car' },
  { key: 'transito', label: 'Espacio de tránsito temporal', icono: 'home' },
  { key: 'trampa', label: 'Jaula trampa (captura)', icono: 'catching-pokemon' },
  { key: 'botiquin', label: 'Botiquín de primeros auxilios', icono: 'medical-services' },
];

export function PerfilVoluntarioScreen({ navigation }: Props) {
  const { bottom } = useSafeAreaInsets();
  const [voluntario, setVoluntario] = useState<Voluntario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [zona, setZona] = useState('');
  const [brigada, setBrigada] = useState('');
  const [recursos, setRecursos] = useState<string[]>([]);

  useEffect(() => {
    authRepository
      .obtenerVoluntarioActual()
      .then((v) => {
        if (v) {
          setVoluntario(v);
          setNombre(v.nombre);
          setTelefono(v.telefono ?? '');
          setZona(v.zona ?? '');
          setBrigada(v.brigada);
          setRecursos(v.recursos ?? []);
        }
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, []);

  const toggleRecurso = (key: string) => {
    setRecursos((prev) =>
      prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]
    );
  };

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      setErrorMsg('El nombre del voluntario no puede estar vacío');
      return;
    }
    setGuardando(true);
    setErrorMsg(null);
    try {
      const actualizado: Voluntario = {
        ...voluntario,
        id: voluntario?.id || 'voluntario-1',
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        zona: zona.trim(),
        brigada: brigada.trim() || `Brigada ${zona.trim() || 'Central'}`,
        recursos,
        email: voluntario?.email,
      };

      await authRepository.actualizarVoluntario(actualizado);
      navigation?.navigate?.('Ajustes');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error al guardar los datos del voluntario.');
      setGuardando(false);
    }
  };

  const iniciales = nombre
    ? nombre
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'VO';

  if (cargando) {
    return (
      <View style={styles.screen}>
        <StackHeader titulo="Perfil del Voluntario" onBack={() => navigation?.goBack?.()} />
        <View style={styles.centro}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StackHeader titulo="Perfil del Voluntario" onBack={() => navigation?.goBack?.()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cabecera del Voluntario (MD3 Surface Container Card) */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarIniciales}>{iniciales}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.avatarNombre}>{nombre || 'Voluntario'}</Text>
            <Text style={styles.avatarEmail}>{voluntario?.email || 'voluntario@perfelino.org'}</Text>
            <View style={styles.rolBadge}>
              <MaterialIcons name="verified" size={14} color={colors.primary} />
              <Text style={styles.rolText}>Voluntario Activo · PERF</Text>
            </View>
          </View>
        </View>

        {errorMsg ? (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={20} color={colors.urgente} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Formulario de Datos Personales */}
        <View style={styles.seccionCard}>
          <View style={styles.seccionHeader}>
            <MaterialIcons name="badge" size={20} color={colors.primary} />
            <Text style={styles.seccionTitulo}>Datos Personales y Operativos</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nombre y Apellido</Text>
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={(t) => {
                setNombre(t);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Nombre completo"
              placeholderTextColor={colors.placeholderField}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Teléfono de guardia / WhatsApp</Text>
            <TextInput
              style={styles.input}
              value={telefono}
              onChangeText={setTelefono}
              placeholder="ej: 11 5432 0000"
              placeholderTextColor={colors.placeholderField}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Zona habitual de rescate</Text>
            <TextInput
              style={styles.input}
              value={zona}
              onChangeText={setZona}
              placeholder="ej: Caballito, Almagro, Flores..."
              placeholderTextColor={colors.placeholderField}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Brigada de pertenencia</Text>
            <TextInput
              style={styles.input}
              value={brigada}
              onChangeText={setBrigada}
              placeholder="ej: Brigada Caballito"
              placeholderTextColor={colors.placeholderField}
            />
          </View>
        </View>

        {/* Recursos de Rescate Disponibles */}
        <View style={styles.seccionCard}>
          <View style={styles.seccionHeader}>
            <MaterialIcons name="inventory-2" size={20} color={colors.primary} />
            <Text style={styles.seccionTitulo}>Recursos y Capacidad Operativa</Text>
          </View>
          <Text style={styles.seccionDesc}>
            Indica con qué elementos contás habitualmente para rescates y traslados de urgencia.
          </Text>

          <View style={styles.recursosList}>
            {RECURSOS_DISPONIBLES.map((r) => {
              const activo = recursos.includes(r.key);
              return (
                <Pressable
                  key={r.key}
                  style={[styles.recursoItem, activo && styles.recursoItemActivo]}
                  onPress={() => toggleRecurso(r.key)}
                >
                  <MaterialIcons
                    name={r.icono}
                    size={22}
                    color={activo ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.recursoLabel, activo && styles.recursoLabelActivo]}>
                    {r.label}
                  </Text>
                  <View style={[styles.recursoCheckbox, activo && styles.recursoCheckboxActivo]}>
                    {activo && <MaterialIcons name="check" size={16} color={colors.onPrimary} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Botón de Guardado */}
        <Pressable
          style={[styles.botonGuardar, guardando && styles.botonDeshabilitado]}
          onPress={handleGuardar}
          disabled={guardando}
        >
          {guardando ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <MaterialIcons name="save" size={20} color={colors.onPrimary} />
              <Text style={styles.botonGuardarTexto}>Guardar Datos del Voluntario</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 16 },

  avatarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surfaceCard,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  avatarIniciales: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.primary,
  },
  avatarNombre: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  avatarEmail: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 1 },
  rolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: colors.surfaceChip,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rolText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.primary },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.urgenteBg,
    padding: 12,
    borderRadius: 12,
  },
  errorText: { fontFamily: fonts.medium, fontSize: 13, color: colors.urgenteText, flex: 1 },

  seccionCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  seccionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seccionTitulo: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  seccionDesc: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, lineHeight: 18 },

  field: { gap: 6 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  input: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    height: 48,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },

  recursosList: { gap: 8, marginTop: 4 },
  recursoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    minHeight: 48,
  },
  recursoItemActivo: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  recursoLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.text, flex: 1 },
  recursoLabelActivo: { fontFamily: fonts.semibold, color: colors.primary },
  recursoCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recursoCheckboxActivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  botonGuardar: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  botonDeshabilitado: { opacity: 0.7 },
  botonGuardarTexto: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.onPrimary,
  },
});
