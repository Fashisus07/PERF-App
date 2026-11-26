import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authRepository, turnoRepository } from '../../../di/container';
import { esAdministrador } from '../../../domain/models/Ajustes';
import {
  CentroVeterinario,
  esHorarioValido,
  HORARIOS_CLINICA,
  normalizarHorarios,
} from '../../../domain/models/Turno';
import { centroNuevo, guardarCentro } from '../../../data/remote/CentrosVeterinariosService';
import { StackHeader } from '../../components/StackHeader';
import { colors, fonts } from '../../theme';

type Props = {
  route?: { params?: { clinicaId?: string } };
  navigation?: any;
};

const TIPOS: { valor: CentroVeterinario['tipo']; etiqueta: string }[] = [
  { valor: 'consultorio', etiqueta: 'Consultorio' },
  { valor: 'hospital', etiqueta: 'Hospital / guardia' },
  { valor: 'quirurgico', etiqueta: 'Quirúrgico' },
];

/** Alta y edición de una veterinaria: la carga el administrador y la bajan todos los celulares. */
export function EditarClinicaScreen({ route, navigation }: Props) {
  const { bottom } = useSafeAreaInsets();
  const clinicaId = route?.params?.clinicaId;
  const [centro, setCentro] = useState<CentroVeterinario | null>(null);
  const [puedeEditar, setPuedeEditar] = useState<boolean | null>(null);
  const [nuevoHorario, setNuevoHorario] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authRepository
      .obtenerVoluntarioActual()
      .then((v) => setPuedeEditar(esAdministrador(v?.rol)))
      .catch(() => setPuedeEditar(false));
    if (!clinicaId) {
      setCentro(centroNuevo());
      return;
    }
    turnoRepository.obtenerClinicas().then((cs) => setCentro(cs.find((c) => c.id === clinicaId) ?? centroNuevo()));
  }, [clinicaId]);

  if (!centro || puedeEditar === null) {
    return (
      <View style={styles.screen}>
        <StackHeader titulo={clinicaId ? 'Editar veterinaria' : 'Nueva veterinaria'} onBack={() => navigation?.goBack?.()} />
        <View style={styles.centro}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  if (!puedeEditar) {
    return (
      <View style={styles.screen}>
        <StackHeader titulo="Veterinarias" onBack={() => navigation?.goBack?.()} />
        <View style={styles.centro}>
          <MaterialIcons name="lock" size={40} color={colors.textSubtle} />
          <Text style={styles.sinPermiso}>Solo el administrador puede cargar y editar veterinarias.</Text>
        </View>
      </View>
    );
  }

  const cambiar = (parcial: Partial<CentroVeterinario>) => setCentro({ ...centro, ...parcial });
  const horarios = normalizarHorarios(centro.horarios);
  // Los de siempre más los que ya cargó este veterinario, para poder sacarlos.
  const opciones = normalizarHorarios([...HORARIOS_CLINICA, ...horarios]);

  const alternarHorario = (h: string) =>
    cambiar({ horarios: horarios.includes(h) ? horarios.filter((x) => x !== h) : normalizarHorarios([...horarios, h]) });

  const agregarHorario = () => {
    const h = nuevoHorario.trim();
    if (!esHorarioValido(h)) {
      setError('El horario va como HH:MM, por ejemplo 08:30 o 17:45.');
      return;
    }
    setError(null);
    cambiar({ horarios: normalizarHorarios([...horarios, h]) });
    setNuevoHorario('');
  };

  const faltantes = [
    !centro.nombre.trim() && 'el nombre',
    !centro.barrio.trim() && 'el barrio',
    !centro.direccion.trim() && 'la dirección',
    !centro.telefono.trim() && 'el teléfono',
  ].filter(Boolean) as string[];

  const guardar = async () => {
    if (faltantes.length) {
      setError(`Falta completar ${faltantes.join(', ')}.`);
      return;
    }
    if (!horarios.length) {
      setError('Elegí al menos un horario de atención.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await guardarCentro({ ...centro, horarios });
      navigation?.goBack?.();
    } catch (e: any) {
      setError(e?.message || 'No se pudo guardar la veterinaria.');
      setGuardando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StackHeader titulo={clinicaId ? 'Editar veterinaria' : 'Nueva veterinaria'} onBack={() => navigation?.goBack?.()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom + 40 }]} keyboardShouldPersistTaps="handled">
        {error ? (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={20} color={colors.urgente} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Campo etiqueta="Nombre de la veterinaria *" valor={centro.nombre} onChange={(v) => cambiar({ nombre: v })} placeholder="Ej: Clínica Veterinaria Patitas" />
        <Campo etiqueta="Veterinario/a a cargo" valor={centro.medico ?? ''} onChange={(v) => cambiar({ medico: v })} placeholder="Ej: Dra. Laura Méndez" />
        <Campo etiqueta="Barrio *" valor={centro.barrio} onChange={(v) => cambiar({ barrio: v })} placeholder="Ej: Almagro" />
        <Campo etiqueta="Dirección *" valor={centro.direccion} onChange={(v) => cambiar({ direccion: v })} placeholder="Ej: Av. Rivadavia 2840" />
        <Campo etiqueta="Teléfono *" valor={centro.telefono} onChange={(v) => cambiar({ telefono: v })} placeholder="Ej: +54 11 4321 0000" teclado="phone-pad" />
        <Campo etiqueta="Detalle (opcional)" valor={centro.detalle ?? ''} onChange={(v) => cambiar({ detalle: v })} placeholder="Ej: Guardia 24 hs" />

        <View style={styles.bloque}>
          <Text style={styles.etiqueta}>Tipo</Text>
          <View style={styles.chips}>
            {TIPOS.map((t) => {
              const activo = centro.tipo === t.valor;
              return (
                <Pressable key={t.valor} style={[styles.chip, activo && styles.chipActivo]} onPress={() => cambiar({ tipo: t.valor })} accessibilityRole="radio" accessibilityState={{ selected: activo }}>
                  <Text style={[styles.chipText, activo && { color: colors.onPrimary }]}>{t.etiqueta}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.bloque}>
          <Text style={styles.etiqueta}>Horarios de atención *</Text>
          <Text style={styles.ayuda}>Los turnos de este veterinario solo se pueden reservar en estos horarios.</Text>
          <View style={styles.chips}>
            {opciones.map((h) => {
              const activo = horarios.includes(h);
              return (
                <Pressable key={h} style={[styles.chip, activo && styles.chipActivo]} onPress={() => alternarHorario(h)} accessibilityRole="checkbox" accessibilityState={{ checked: activo }}>
                  <Text style={[styles.chipText, activo && { color: colors.onPrimary }]}>{h}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.agregarRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={nuevoHorario}
              onChangeText={setNuevoHorario}
              placeholder="Otro horario (HH:MM)"
              placeholderTextColor={colors.placeholderField}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              onSubmitEditing={agregarHorario}
            />
            <Pressable style={styles.btnAgregar} onPress={agregarHorario} accessibilityLabel="Agregar horario">
              <MaterialIcons name="add" size={22} color={colors.onPrimary} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.bloque, styles.switchRow]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.etiqueta}>Está atendiendo</Text>
            <Text style={styles.ayuda}>Apagalo si la veterinaria dejó de trabajar con PERF.</Text>
          </View>
          <Switch value={centro.abierto} onValueChange={(v) => cambiar({ abierto: v })} trackColor={{ true: colors.primary }} />
        </View>

        <Pressable style={[styles.btnGuardar, guardando && { opacity: 0.7 }]} onPress={guardar} disabled={guardando}>
          {guardando ? <ActivityIndicator color={colors.onPrimary} /> : <MaterialIcons name="check-circle" size={22} color={colors.onPrimary} />}
          <Text style={styles.btnGuardarText}>Guardar veterinaria</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Campo({
  etiqueta,
  valor,
  onChange,
  placeholder,
  teclado,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  teclado?: 'phone-pad';
}) {
  return (
    <View style={styles.bloque}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <TextInput style={styles.input} value={valor} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.placeholderField} keyboardType={teclado} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  sinPermiso: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  content: { padding: 16, gap: 16 },
  bloque: { gap: 8 },
  etiqueta: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  ayuda: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 9999, backgroundColor: colors.surfaceChip, minHeight: 44, justifyContent: 'center' },
  chipActivo: { backgroundColor: colors.primary },
  chipText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  agregarRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  btnAgregar: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.urgenteBg, padding: 14, borderRadius: 12 },
  errorText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.urgenteText },
  btnGuardar: { height: 52, borderRadius: 26, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 },
  btnGuardarText: { fontFamily: fonts.bold, fontSize: 16, color: colors.onPrimary },
});
