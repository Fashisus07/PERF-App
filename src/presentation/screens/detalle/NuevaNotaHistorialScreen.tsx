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
import { ETIQUETA_EVENTO, TipoEvento } from '../../../domain/models/Caso';
import { StackHeader } from '../../components/StackHeader';
import { useCaso } from '../../hooks/useCaso';
import { useCasoStore } from '../../stores/useCasoStore';
import { colors, fonts } from '../../theme';

type Props = {
  route?: { params?: { casoId: string } };
  navigation?: any;
};

const TIPOS_DISPONIBLES: { tipo: TipoEvento; icono: keyof typeof MaterialIcons.glyphMap; desc: string }[] = [
  { tipo: 'NOTA_CAMPO', icono: 'edit-note', desc: 'Comportamiento en tránsito, apetito o novedades' },
  { tipo: 'TRATAMIENTO', icono: 'medication', desc: 'Antibiótico, antiinflamatorio, colirio, etc.' },
  { tipo: 'VACUNACION', icono: 'vaccines', desc: 'Triple felina, antirrábica o refuerzo' },
  { tipo: 'VISITA_VETERINARIA', icono: 'healing', desc: 'Control postquirúrgico o revisión de heridas' },
];

export function NuevaNotaHistorialScreen({ route, navigation }: Props) {
  const { bottom } = useSafeAreaInsets();
  const casoId = route?.params?.casoId ?? '';
  const { caso, cargando } = useCaso(casoId);
  const agregarEventoHistorial = useCasoStore((s) => s.agregarEventoHistorial);

  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoEvento>('NOTA_CAMPO');
  const [descripcion, setDescripcion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGuardar = async () => {
    if (!descripcion.trim()) {
      setErrorMsg('Por favor ingresá una descripción para la nota.');
      return;
    }
    setGuardando(true);
    setErrorMsg(null);
    try {
      await agregarEventoHistorial(casoId, tipoSeleccionado, descripcion.trim());
      navigation?.navigate?.('DetalleCaso', { casoId, estadoActualizado: true });
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error al guardar la nota en el historial.');
      setGuardando(false);
    }
  };

  if (cargando || !caso) {
    return (
      <View style={styles.screen}>
        <StackHeader titulo="Agregar Nota" onBack={() => navigation?.goBack?.()} />
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
      <StackHeader titulo="Nueva Nota Operativa" onBack={() => navigation?.goBack?.()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Banner Paciente */}
        <View style={styles.pacienteCard}>
          <View style={styles.pacienteIcono}>
            <MaterialIcons name="pets" size={24} color={colors.primary} />
          </View>
          <View style={styles.pacienteInfo}>
            <Text style={styles.pacienteNombre}>{caso.nombreProvisorio}</Text>
            <Text style={styles.pacienteSub}>
              Línea de tiempo clínica · {caso.barrio}
            </Text>
          </View>
        </View>

        {errorMsg ? (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={20} color={colors.urgente} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Selector de Tipo de Evento (MD3 Selection Cards) */}
        <View style={styles.seccionCard}>
          <View style={styles.seccionHeader}>
            <MaterialIcons name="category" size={20} color={colors.primary} />
            <Text style={styles.seccionTitulo}>Tipo de Novedad</Text>
          </View>
          <Text style={styles.seccionDesc}>
            Categorizá la evolución para el seguimiento coordinado del equipo y la clínica.
          </Text>

          <View style={styles.tiposList}>
            {TIPOS_DISPONIBLES.map((item) => {
              const activo = tipoSeleccionado === item.tipo;
              return (
                <Pressable
                  key={item.tipo}
                  style={[styles.tipoItem, activo && styles.tipoItemActivo]}
                  onPress={() => {
                    setTipoSeleccionado(item.tipo);
                    if (errorMsg) setErrorMsg(null);
                  }}
                >
                  <View style={[styles.tipoIcono, activo && styles.tipoIconoActivo]}>
                    <MaterialIcons
                      name={item.icono}
                      size={22}
                      color={activo ? colors.onPrimary : colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tipoTitulo, activo && styles.tipoTituloActivo]}>
                      {ETIQUETA_EVENTO[item.tipo] || item.tipo}
                    </Text>
                    <Text style={styles.tipoSub}>{item.desc}</Text>
                  </View>
                  {activo && (
                    <MaterialIcons name="check-circle" size={22} color={colors.primary} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Detalle de la Nota / Evolución */}
        <View style={styles.seccionCard}>
          <View style={styles.seccionHeader}>
            <MaterialIcons name="description" size={20} color={colors.primary} />
            <Text style={styles.seccionTitulo}>Detalle de la Observación</Text>
          </View>
          <Text style={styles.seccionDesc}>
            Indicá dosis, respuesta al tratamiento, estado anímico o cualquier incidencia relevante.
          </Text>

          <TextInput
            style={styles.textArea}
            value={descripcion}
            onChangeText={(t) => {
              setDescripcion(t);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="ej: Comenzó con amoxicilina 50mg cada 12 hs por 7 días. Tolera bien la medicación con pasta palatable. Ánimo estable..."
            placeholderTextColor={colors.placeholderField}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
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
              <MaterialIcons name="add-task" size={22} color={colors.onPrimary} />
              <Text style={styles.botonGuardarTexto}>Registrar Nota en Historial</Text>
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

  tiposList: { gap: 10, marginTop: 4 },
  tipoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    minHeight: 56,
  },
  tipoItemActivo: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  tipoIcono: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipoIconoActivo: {
    backgroundColor: colors.primary,
  },
  tipoTitulo: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  tipoTituloActivo: { color: colors.primary, fontFamily: fonts.bold },
  tipoSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },

  textArea: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    minHeight: 120,
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
