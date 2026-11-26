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
import {
  COORDINADORES_PERF,
  Especie,
  ETIQUETA_ESPECIE,
  Vulnerabilidad,
} from '../../../domain/models/Caso';
import { calcularPrioridadCasoUseCase } from '../../../domain/usecases/CalcularPrioridadCasoUseCase';
import { StackHeader } from '../../components/StackHeader';
import { obtenerAjustes } from '../../hooks/useAjustes';
import { useCaso } from '../../hooks/useCaso';
import { useCasoStore } from '../../stores/useCasoStore';
import { colors, fonts } from '../../theme';

type Props = {
  route?: { params?: { casoId: string } };
  navigation?: any;
};

const ESPECIES: { key: Especie; emoji: string }[] = [
  { key: 'Gato', emoji: '🐱' },
  { key: 'Perro', emoji: '🐶' },
  { key: 'Otro', emoji: '🐾' },
];

export function EditarCasoScreen({ route, navigation }: Props) {
  const { bottom } = useSafeAreaInsets();
  const casoId = route?.params?.casoId ?? '';
  const { caso, cargando } = useCaso(casoId);
  const actualizarCaso = useCasoStore((s) => s.actualizarCaso);

  const [umbralDias, setUmbralDias] = useState(15);
  const [nombreProvisorio, setNombreProvisorio] = useState<string | null>(null);
  const [especie, setEspecie] = useState<Especie | null>(null);
  const [cantidadAnimales, setCantidadAnimales] = useState<number | null>(null);
  const [edadEstimada, setEdadEstimada] = useState<string | null>(null);
  const [barrio, setBarrio] = useState<string | null>(null);
  const [quienSigueCaso, setQuienSigueCaso] = useState<string | null>(null);
  const [transitoNombre, setTransitoNombre] = useState<string | null>(null);
  const [transitoTelefono, setTransitoTelefono] = useState<string | null>(null);
  const [transitoCorreo, setTransitoCorreo] = useState<string | null>(null);
  const [historiaOrigen, setHistoriaOrigen] = useState<string | null>(null);
  const [personalidad, setPersonalidad] = useState<string | null>(null);
  const [estadoVisible, setEstadoVisible] = useState<string | null>(null);
  const [actualizarVulnerabilidad, setActualizarVulnerabilidad] = useState<Vulnerabilidad | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    obtenerAjustes()
      .then((a) => setUmbralDias(a.umbralUrgenteDias))
      .catch(() => {});
  }, []);

  if (cargando || !caso) {
    return (
      <View style={styles.screen}>
        <StackHeader titulo="Editar Ficha del Caso" onBack={() => navigation?.goBack?.()} />
        <View style={styles.centro}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  const valNombre = nombreProvisorio !== null ? nombreProvisorio : caso.nombreProvisorio;
  const valEspecie = especie ?? caso.especie;
  const valCantidad = cantidadAnimales ?? caso.cantidadAnimales ?? 1;
  const valEdad = edadEstimada !== null ? edadEstimada : caso.edadEstimada;
  const valBarrio = barrio !== null ? barrio : caso.barrio;
  const valCoord = quienSigueCaso !== null ? quienSigueCaso : caso.quienSigueCaso;
  const valTransitoNombre = transitoNombre !== null ? transitoNombre : caso.transito.nombre;
  const valTransitoTel = transitoTelefono !== null ? transitoTelefono : caso.transito.telefono;
  const valTransitoCorreo = transitoCorreo !== null ? transitoCorreo : caso.transito.correo ?? '';
  const valHistoria = historiaOrigen !== null ? historiaOrigen : caso.historiaOrigen;
  const valPersonalidad = personalidad !== null ? personalidad : caso.personalidad;
  const valEstadoVisible = estadoVisible !== null ? estadoVisible : caso.estadoVisible;

  const tieneTransitoAhora = Boolean(valTransitoNombre.trim());
  const sugerirCambioTransito =
    (caso.vulnerabilidad === 'SIN_TRANSITO' && tieneTransitoAhora) ||
    (caso.vulnerabilidad !== 'SIN_TRANSITO' && !tieneTransitoAhora && caso.estadoCaso === 'EN_TRANSITO');

  const valVulnerabilidad = actualizarVulnerabilidad ?? caso.vulnerabilidad;

  const handleGuardar = async () => {
    if (!valNombre.trim() || !valBarrio.trim()) {
      setErrorMsg('El nombre provisorio y el barrio del hallazgo son obligatorios.');
      return;
    }

    setGuardando(true);
    setErrorMsg(null);
    try {
      const ahora = Date.now();
      const prioridad = calcularPrioridadCasoUseCase.ejecutar(
        {
          estadoCaso: caso.estadoCaso,
          gravedadClinica: caso.gravedadClinica,
          vulnerabilidad: valVulnerabilidad,
          fechaRescate: caso.fechaRescate,
          sanidad: caso.sanidad,
        },
        umbralDias,
        ahora
      );

      await actualizarCaso({
        ...caso,
        nombreProvisorio: valNombre.trim(),
        especie: valEspecie,
        cantidadAnimales: valCantidad,
        edadEstimada: valEdad.trim(),
        barrio: valBarrio.trim(),
        quienSigueCaso: valCoord.trim() || 'PERF',
        transito: {
          nombre: valTransitoNombre.trim(),
          telefono: valTransitoTel.trim(),
          correo: valTransitoCorreo.trim() || undefined,
        },
        historiaOrigen: valHistoria.trim(),
        personalidad: valPersonalidad.trim(),
        estadoVisible: valEstadoVisible.trim(),
        vulnerabilidad: valVulnerabilidad,
        nivelPrioridad: prioridad.nivelPrioridad,
        motivoUrgencia: prioridad.motivoUrgencia,
        puntajePrioridad: prioridad.puntajePrioridad,
        esUrgente: prioridad.esUrgente,
      });

      navigation?.navigate?.('DetalleCaso', { casoId: caso.id, estadoActualizado: true });
    } catch (e: any) {
      setErrorMsg(e?.message || 'No se pudieron guardar los cambios.');
      setGuardando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StackHeader titulo="Editar Datos del Caso" onBack={() => navigation?.goBack?.()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {errorMsg ? (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={20} color={colors.urgente} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Identificación */}
        <View style={styles.card}>
          <View style={styles.seccionHeader}>
            <MaterialIcons name="pets" size={20} color={colors.primary} />
            <Text style={styles.seccionTitulo}>Identificación del Animal</Text>
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Nombre provisorio / Camada *</Text>
            <TextInput
              style={styles.input}
              value={valNombre}
              onChangeText={setNombreProvisorio}
              placeholder="Ej: Tigre / Mamá con bebés"
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Especie</Text>
            <View style={styles.chipsRow}>
              {ESPECIES.map((item) => {
                const activo = valEspecie === item.key;
                return (
                  <Pressable
                    key={item.key}
                    style={[styles.chip, activo && styles.chipActivo]}
                    onPress={() => setEspecie(item.key)}
                  >
                    <Text style={styles.emoji}>{item.emoji}</Text>
                    <Text style={[styles.chipText, activo && styles.chipTextActivo]}>
                      {ETIQUETA_ESPECIE[item.key]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Cantidad de animales</Text>
            <View style={styles.chipsRow}>
              {[1, 2, 3, 4, 5].map((n) => {
                const activo = valCantidad === n;
                return (
                  <Pressable
                    key={n}
                    style={[styles.contadorChip, activo && styles.chipActivo]}
                    onPress={() => setCantidadAnimales(n)}
                  >
                    <Text style={[styles.chipText, activo && styles.chipTextActivo]}>
                      {n === 5 ? '5+' : n}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Edad estimada</Text>
            <TextInput
              style={styles.input}
              value={valEdad}
              onChangeText={setEdadEstimada}
              placeholder="Ej: 8 meses, Adulto (2 años aprox.)"
              placeholderTextColor={colors.placeholder}
            />
          </View>
        </View>

        {/* Ubicación y Seguimiento */}
        <View style={styles.card}>
          <View style={styles.seccionHeader}>
            <MaterialIcons name="place" size={20} color={colors.primary} />
            <Text style={styles.seccionTitulo}>Ubicación y Coordinación</Text>
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Barrio o localidad del hallazgo *</Text>
            <TextInput
              style={styles.input}
              value={valBarrio}
              onChangeText={setBarrio}
              placeholder="Ej: Palermo, Caballito, Almagro"
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Coordinador PERF responsable</Text>
            <View style={styles.chipsRow}>
              {COORDINADORES_PERF.map((coord) => {
                const activo = valCoord === coord;
                return (
                  <Pressable
                    key={coord}
                    style={[styles.chip, activo && styles.chipActivo]}
                    onPress={() => setQuienSigueCaso(coord)}
                  >
                    <Text style={[styles.chipText, activo && styles.chipTextActivo]}>{coord}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              style={[styles.input, { marginTop: 6 }]}
              value={valCoord}
              onChangeText={setQuienSigueCaso}
              placeholder="Otro nombre de coordinador..."
              placeholderTextColor={colors.placeholder}
            />
          </View>
        </View>

        {/* Hogar de Tránsito */}
        <View style={styles.card}>
          <View style={styles.seccionHeader}>
            <MaterialIcons name="home" size={20} color={colors.primary} />
            <Text style={styles.seccionTitulo}>Hogar de Tránsito / Responsable</Text>
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Nombre y apellido (o clínica / adoptante)</Text>
            <TextInput
              style={styles.input}
              value={valTransitoNombre}
              onChangeText={setTransitoNombre}
              placeholder="Ej: Mariana Gómez"
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Teléfono / WhatsApp</Text>
            <TextInput
              style={styles.input}
              value={valTransitoTel}
              onChangeText={setTransitoTelefono}
              keyboardType="phone-pad"
              placeholder="Ej: +5491154320000"
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Correo electrónico (opcional)</Text>
            <TextInput
              style={styles.input}
              value={valTransitoCorreo}
              onChangeText={setTransitoCorreo}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Ej: contacto@ejemplo.com"
              placeholderTextColor={colors.placeholder}
            />
          </View>

          {sugerirCambioTransito && (
            <Pressable
              style={styles.sugerenciaBox}
              onPress={() =>
                setActualizarVulnerabilidad((prev) =>
                  prev ? null : tieneTransitoAhora ? 'ESTABLE' : 'SIN_TRANSITO'
                )
              }
            >
              <MaterialIcons
                name={actualizarVulnerabilidad ? 'check-box' : 'check-box-outline-blank'}
                size={20}
                color={colors.primary}
              />
              <Text style={styles.sugerenciaText}>
                {tieneTransitoAhora
                  ? 'Este caso figura "Sin tránsito". Toca aquí para pasarlo a "Estable" al guardar.'
                  : 'Quitaste el hogar de tránsito. Toca aquí para marcarlo como "Sin tránsito" en el triaje.'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Historia, Comportamiento y Condición Visible */}
        <View style={styles.card}>
          <View style={styles.seccionHeader}>
            <MaterialIcons name="psychology" size={20} color={colors.primary} />
            <Text style={styles.seccionTitulo}>Historia y Observaciones</Text>
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Antecedentes / Origen</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={valHistoria}
              onChangeText={setHistoriaOrigen}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholder="Cómo fue encontrado, situación previa..."
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Personalidad / Comportamiento</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={valPersonalidad}
              onChangeText={setPersonalidad}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholder="Carácter, convivencia con otros animales o personas..."
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Condición visible / notas físicas</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={valEstadoVisible}
              onChangeText={setEstadoVisible}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholder="Observaciones físicas o clínicas visibles..."
              placeholderTextColor={colors.placeholder}
            />
          </View>
        </View>

        <Pressable
          style={[styles.botonGuardar, guardando && { opacity: 0.7 }]}
          onPress={handleGuardar}
          disabled={guardando}
        >
          {guardando ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <MaterialIcons name="save" size={20} color={colors.onPrimary} />
              <Text style={styles.botonGuardarTexto}>Guardar Cambios</Text>
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.urgenteBg,
    padding: 14,
    borderRadius: 12,
  },
  errorText: { fontFamily: fonts.medium, fontSize: 14, color: colors.urgenteText, flex: 1 },
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  seccionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seccionTitulo: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  campo: { gap: 6 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSubtle },
  input: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  textArea: { minHeight: 76 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flex: 1,
    minWidth: 72,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
  },
  contadorChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  emoji: { fontSize: 15 },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  chipTextActivo: { color: colors.onPrimary },
  sugerenciaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primarySoft,
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  sugerenciaText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
    lineHeight: 18,
  },
  botonGuardar: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  botonGuardarTexto: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.onPrimary,
  },
});
