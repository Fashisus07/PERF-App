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
import {
  EstadoCastracion,
  ETIQUETA_CASTRACION,
  ETIQUETA_VIRALES,
  EstadoVirales,
} from '../../../domain/models/Caso';
import { StackHeader } from '../../components/StackHeader';
import { useCaso } from '../../hooks/useCaso';
import { useCasoStore } from '../../stores/useCasoStore';
import { colors, fonts } from '../../theme';

type Props = {
  route?: { params?: { casoId: string } };
  navigation?: any;
};

const OPCIONES_CASTRACION: EstadoCastracion[] = ['PENDIENTE', 'SI', 'NO'];
const OPCIONES_VIRALES: EstadoVirales[] = [
  'PENDIENTE',
  'NEGATIVO',
  'VIF_POSITIVO',
  'VILEF_POSITIVO',
  'AMBOS_POSITIVOS',
];

export function EditarSanidadScreen({ route, navigation }: Props) {
  const { bottom } = useSafeAreaInsets();
  const casoId = route?.params?.casoId ?? '';
  const { caso, cargando } = useCaso(casoId);
  const actualizarCaso = useCasoStore((s) => s.actualizarCaso);

  const [castrado, setCastrado] = useState<EstadoCastracion | null>(null);
  const [virales, setVirales] = useState<EstadoVirales | null>(null);
  const [desp1, setDesp1] = useState<boolean | null>(null);
  const [desp2, setDesp2] = useState<boolean | null>(null);
  const [estadoVisible, setEstadoVisible] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Valores inicializados con los del caso si no fueron tocados
  const valorCastrado = castrado ?? caso?.sanidad?.castrado ?? 'PENDIENTE';
  const valorVirales = virales ?? caso?.sanidad?.virales ?? 'PENDIENTE';
  const tieneDesp1 = desp1 !== null ? desp1 : Boolean(caso?.sanidad?.fechaPrimeraDesparasitacion);
  const tieneDesp2 = desp2 !== null ? desp2 : Boolean(caso?.sanidad?.fechaSegundaDesparasitacion);
  const textoVisible = estadoVisible !== null ? estadoVisible : caso?.estadoVisible ?? '';

  const handleGuardar = async () => {
    if (!caso) return;
    setGuardando(true);
    setErrorMsg(null);
    try {
      const ahora = Date.now();
      const casoActualizado = {
        ...caso,
        estadoVisible: textoVisible.trim(),
        sanidad: {
          ...caso.sanidad,
          castrado: valorCastrado,
          virales: valorVirales,
          fechaPrimeraDesparasitacion: tieneDesp1
            ? caso.sanidad.fechaPrimeraDesparasitacion || ahora
            : undefined,
          fechaSegundaDesparasitacion: tieneDesp2
            ? caso.sanidad.fechaSegundaDesparasitacion || ahora
            : undefined,
        },
      };

      await actualizarCaso(casoActualizado);
      navigation?.navigate?.('DetalleCaso', { casoId: caso.id, estadoActualizado: true });
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error al guardar la ficha sanitaria');
      setGuardando(false);
    }
  };

  if (cargando || !caso) {
    return (
      <View style={styles.screen}>
        <StackHeader titulo="Editar Ficha Sanitaria" onBack={() => navigation?.goBack?.()} />
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
      <StackHeader titulo="Ficha Sanitaria" onBack={() => navigation?.goBack?.()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Banner de Identificación del Paciente (MD3 Surface Container) */}
        <View style={styles.pacienteCard}>
          <View style={styles.pacienteIcono}>
            <MaterialIcons name="pets" size={24} color={colors.primary} />
          </View>
          <View style={styles.pacienteInfo}>
            <Text style={styles.pacienteNombre}>{caso.nombreProvisorio}</Text>
            <Text style={styles.pacienteSub}>
              {caso.especie} · {caso.barrio} · {caso.edadEstimada || 'Edad no informada'}
            </Text>
          </View>
        </View>

        {errorMsg ? (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={20} color={colors.urgente} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Sección Castración (MD3 Segmented Options) */}
        <View style={styles.seccionCard}>
          <View style={styles.seccionHeader}>
            <MaterialIcons name="healing" size={20} color={colors.primary} />
            <Text style={styles.seccionTitulo}>Estado de Castración</Text>
          </View>
          <Text style={styles.seccionDesc}>
            Prioritario para corte de celos, preñeces no deseadas y marcaje.
          </Text>

          <View style={styles.chipsRow}>
            {OPCIONES_CASTRACION.map((opcion) => {
              const activo = valorCastrado === opcion;
              return (
                <Pressable
                  key={opcion}
                  style={[styles.chip, activo && styles.chipActivo]}
                  onPress={() => setCastrado(opcion)}
                >
                  {activo && <MaterialIcons name="check" size={16} color={colors.onPrimary} />}
                  <Text style={[styles.chipText, activo && styles.chipTextActivo]}>
                    {ETIQUETA_CASTRACION[opcion]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Sección Virales VIF / ViLeF (MD3 Segmented Options) */}
        <View style={styles.seccionCard}>
          <View style={styles.seccionHeader}>
            <MaterialIcons name="biotech" size={20} color={colors.primary} />
            <Text style={styles.seccionTitulo}>Serología Virales (VIF / ViLeF)</Text>
          </View>
          <Text style={styles.seccionDesc}>
            Test rápido de inmunodeficiencia y leucemia felina.
          </Text>

          <View style={styles.viralesList}>
            {OPCIONES_VIRALES.map((opcion) => {
              const activo = valorVirales === opcion;
              const esPositivo = opcion.includes('POSITIVO');
              return (
                <Pressable
                  key={opcion}
                  style={[
                    styles.radioItem,
                    activo && styles.radioItemActivo,
                    activo && esPositivo && styles.radioItemUrgente,
                  ]}
                  onPress={() => setVirales(opcion)}
                >
                  <View style={[styles.radioDot, activo && styles.radioDotActivo]}>
                    {activo && <View style={styles.radioDotInner} />}
                  </View>
                  <Text
                    style={[
                      styles.radioLabel,
                      activo && styles.radioLabelActivo,
                      activo && esPositivo && { color: colors.urgente },
                    ]}
                  >
                    {ETIQUETA_VIRALES[opcion]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Sección Desparasitaciones (MD3 Toggle Cards) */}
        <View style={styles.seccionCard}>
          <View style={styles.seccionHeader}>
            <MaterialIcons name="medication" size={20} color={colors.primary} />
            <Text style={styles.seccionTitulo}>Plan de Desparasitación</Text>
          </View>
          <Text style={styles.seccionDesc}>
            Tratamiento antiparasitario interno (amplio espectro) y externo.
          </Text>

          <View style={styles.despCard}>
            <Pressable
              style={styles.toggleRow}
              onPress={() => setDesp1(!tieneDesp1)}
            >
              <View style={[styles.checkbox, tieneDesp1 && styles.checkboxActivo]}>
                {tieneDesp1 && <MaterialIcons name="check" size={16} color={colors.onPrimary} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitulo}>1° Desparasitación</Text>
                <Text style={styles.toggleSub}>
                  {tieneDesp1
                    ? 'Aplicada · Dosis inicial cumplida'
                    : 'Pendiente de suministro en tránsito o clínica'}
                </Text>
              </View>
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={styles.toggleRow}
              onPress={() => setDesp2(!tieneDesp2)}
            >
              <View style={[styles.checkbox, tieneDesp2 && styles.checkboxActivo]}>
                {tieneDesp2 && <MaterialIcons name="check" size={16} color={colors.onPrimary} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitulo}>2° Desparasitación (Refuerzo a los 15 días)</Text>
                <Text style={styles.toggleSub}>
                  {tieneDesp2
                    ? 'Aplicada · Refuerzo antiparasitario completado'
                    : 'Pendiente para cortar ciclo larvario'}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Condición Visible y Observaciones Clínicas */}
        <View style={styles.seccionCard}>
          <View style={styles.seccionHeader}>
            <MaterialIcons name="notes" size={20} color={colors.primary} />
            <Text style={styles.seccionTitulo}>Condición Visible y Cuidados Especiales</Text>
          </View>
          <Text style={styles.seccionDesc}>
            Detallá heridas, estado de pelaje, ectoparásitos, apetito o tratamientos en curso.
          </Text>

          <TextInput
            style={styles.textArea}
            value={textoVisible}
            onChangeText={setEstadoVisible}
            placeholder="ej: En tratamiento con colirio por conjuntivitis. Buen apetito, activo. Sin pulgas visibles..."
            placeholderTextColor={colors.placeholderField}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Botón de Guardado (MD3 Filled Button) */}
        <Pressable
          style={[styles.botonGuardar, guardando && styles.botonDeshabilitado]}
          onPress={handleGuardar}
          disabled={guardando}
        >
          {guardando ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <MaterialIcons name="check-circle" size={22} color={colors.onPrimary} />
              <Text style={styles.botonGuardarTexto}>Guardar Ficha Sanitaria</Text>
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

  pacienteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    padding: 16,
    borderRadius: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pacienteIcono: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pacienteInfo: { flex: 1 },
  pacienteNombre: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  pacienteSub: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted, marginTop: 2 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.urgenteBg,
    padding: 14,
    borderRadius: 12,
  },
  errorText: { fontFamily: fonts.medium, fontSize: 14, color: colors.urgenteText, flex: 1 },

  seccionCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  seccionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seccionTitulo: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  seccionDesc: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, lineHeight: 18 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
  },
  chipActivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted },
  chipTextActivo: { color: colors.onPrimary },

  viralesList: { gap: 8, marginTop: 4 },
  radioItem: {
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
  radioItemActivo: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  radioItemUrgente: {
    backgroundColor: colors.urgenteBg,
    borderColor: colors.urgente,
  },
  radioDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDotActivo: { borderColor: colors.primary },
  radioDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.text, flex: 1 },
  radioLabelActivo: { fontFamily: fonts.bold, color: colors.primary },

  despCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 6,
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    minHeight: 52,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleTitulo: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  toggleSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 12 },

  textArea: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    minHeight: 100,
    marginTop: 4,
  },

  botonGuardar: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
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
