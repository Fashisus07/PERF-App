import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  COORDINADORES_PERF,
  Especie,
  EstadoCastracion,
  EstadoVirales,
  ETIQUETA_CASTRACION,
  ETIQUETA_ESPECIE,
  ETIQUETA_VIRALES,
} from '../../../domain/models/Caso';
import { BorradorRescate, faltantesDelRescate } from '../../../domain/models/Rescate';
import { useUbicacion } from '../../hooks/useUbicacion';
import { colors, fonts } from '../../theme';
import { SegmentosPaso } from './BarraRescate';

type Props = {
  borrador: BorradorRescate;
  onCambio: (cambios: Partial<BorradorRescate>) => void;
  onVolverAFoto: () => void;
  onContinuar: () => void;
};

const ESPECIES: { key: Especie; emoji: string }[] = [
  { key: 'Gato', emoji: '🐱' },
  { key: 'Perro', emoji: '🐶' },
  { key: 'Otro', emoji: '🐾' },
];

const CASTRACION_OPCIONES: EstadoCastracion[] = ['PENDIENTE', 'SI', 'NO'];
const VIRALES_OPCIONES: EstadoVirales[] = [
  'PENDIENTE',
  'NEGATIVO',
  'VIF_POSITIVO',
  'VILEF_POSITIVO',
  'AMBOS_POSITIVOS',
];

export function PasoDatos({ borrador: b, onCambio, onVolverAFoto, onContinuar }: Props) {
  const gps = useUbicacion();
  const [intento, setIntento] = useState(false);
  const faltan = faltantesDelRescate(b);

  const usarGps = async () => {
    const r = await gps.obtener();
    if (r) {
      onCambio({
        barrio: r.texto,
        coordenadas: r.coordenadas,
      });
    }
  };

  const continuar = () => {
    if (faltan.length) {
      setIntento(true);
      return;
    }
    onContinuar();
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.stepper}>
        <View style={styles.stepperRow}>
          <Pressable style={styles.volver} onPress={onVolverAFoto}>
            <MaterialIcons name="arrow-back" size={18} color={colors.textMuted} />
            <Text style={styles.volverText}>Paso 1 (Foto)</Text>
          </Pressable>
          <Text style={styles.pasoActual}>Paso 2 de 3</Text>
          <Text style={styles.pasoSub}>Ficha Operativa</Text>
        </View>
        <SegmentosPaso paso={2} />
      </View>

      {/* Tarjeta de Identificación */}
      <View style={styles.card}>
        <View style={styles.fotoRow}>
          {b.fotoUri ? (
            <Image source={{ uri: b.fotoUri }} style={styles.foto} />
          ) : (
            <View style={[styles.foto, styles.fotoVacia]}>
              <MaterialIcons name="pets" size={32} color={colors.textSubtle} />
            </View>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.campoLabel}>Nombre provisorio / Camada *</Text>
            <TextInput
              style={[styles.input, intento && !b.nombreProvisorio.trim() && styles.inputError]}
              placeholder="Ej: Misho / Mamá con 4 bebés"
              placeholderTextColor={colors.placeholder}
              value={b.nombreProvisorio}
              onChangeText={(nombreProvisorio) => onCambio({ nombreProvisorio })}
            />
          </View>
        </View>

        {/* Cantidad de animales */}
        <View style={styles.campo}>
          <Text style={styles.campoLabel}>Cantidad de animales rescatados</Text>
          <View style={styles.contadorRow}>
            {[1, 2, 3, 4, 5].map((num) => (
              <Pressable
                key={num}
                style={[
                  styles.contadorChip,
                  b.cantidadAnimales === num && styles.chipActivo,
                ]}
                onPress={() => onCambio({ cantidadAnimales: num })}
              >
                <Text
                  style={[
                    styles.contadorChipText,
                    b.cantidadAnimales === num && styles.chipActivoText,
                  ]}
                >
                  {num === 5 ? '5+' : num}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Especie */}
        <View style={styles.campo}>
          <Text style={styles.campoLabel}>Especie *</Text>
          <View style={styles.chipsRow}>
            {ESPECIES.map(({ key, emoji }) => (
              <Pressable
                key={key}
                style={[styles.chip, b.especie === key && styles.chipActivo]}
                onPress={() => onCambio({ especie: key })}
              >
                <Text style={styles.chipEmoji}>{emoji}</Text>
                <Text
                  style={[
                    styles.chipTexto,
                    b.especie === key && styles.chipActivoText,
                  ]}
                >
                  {ETIQUETA_ESPECIE[key]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Edad estimada */}
        <View style={styles.campo}>
          <Text style={styles.campoLabel}>Edad estimada</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 45 días, Bebé, 2 años aprox."
            placeholderTextColor={colors.placeholder}
            value={b.edadEstimada}
            onChangeText={(edadEstimada) => onCambio({ edadEstimada })}
          />
        </View>
      </View>

      {/* Tarjeta de Ubicación y GPS */}
      <View style={styles.card}>
        <View style={styles.seccionHeader}>
          <MaterialIcons name="place" size={20} color={colors.primary} />
          <Text style={styles.seccionTitulo}>Ubicación del Hallazgo</Text>
        </View>

        <View style={styles.campo}>
          <Text style={styles.campoLabel}>Barrio o localidad del rescate *</Text>
          <TextInput
            style={[styles.input, intento && !b.barrio.trim() && styles.inputError]}
            placeholder="Ej: Caballito / Plaza Miserere, Balvanera"
            placeholderTextColor={colors.placeholder}
            value={b.barrio}
            onChangeText={(barrio) => onCambio({ barrio })}
          />
        </View>

        <Pressable
          style={[styles.btnGps, gps.estado === 'buscando' && styles.btnGpsBuscando]}
          onPress={usarGps}
          disabled={gps.estado === 'buscando'}
        >
          <MaterialIcons
            name={gps.estado === 'buscando' ? 'hourglass-empty' : 'my-location'}
            size={18}
            color={colors.primary}
          />
          <Text style={styles.btnGpsText}>
            {gps.estado === 'buscando' ? 'Capturando coordenadas...' : 'Capturar GPS puntual (expo-location)'}
          </Text>
        </Pressable>

        {b.coordenadas && (
          <View style={styles.coordenadasInfo}>
            <MaterialIcons name="check-circle" size={14} color={colors.aldia} />
            <Text style={styles.coordenadasTexto}>
              GPS: {b.coordenadas.latitud.toFixed(4)}, {b.coordenadas.longitud.toFixed(4)}
            </Text>
          </View>
        )}
      </View>

      {/* Tarjeta de Seguimiento PERF y Tránsito */}
      <View style={styles.card}>
        <View style={styles.seccionHeader}>
          <MaterialIcons name="volunteer-activism" size={20} color={colors.primary} />
          <Text style={styles.seccionTitulo}>Seguimiento y Tránsito</Text>
        </View>

        <View style={styles.campo}>
          <Text style={styles.campoLabel}>Coordinador responsable (PERF)</Text>
          <View style={styles.chipsRow}>
            {COORDINADORES_PERF.map((coord) => (
              <Pressable
                key={coord}
                style={[styles.chip, b.quienSigueCaso === coord && styles.chipActivo]}
                onPress={() => onCambio({ quienSigueCaso: coord })}
              >
                <Text
                  style={[
                    styles.chipTexto,
                    b.quienSigueCaso === coord && styles.chipActivoText,
                  ]}
                >
                  {coord}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.campo}>
          <Text style={styles.campoLabel}>Hogar de tránsito (Responsable)</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre y apellido del tránsito"
            placeholderTextColor={colors.placeholder}
            value={b.transitoNombre}
            onChangeText={(transitoNombre) => onCambio({ transitoNombre })}
          />
        </View>

        <View style={styles.campo}>
          <Text style={styles.campoLabel}>Teléfono celular de contacto</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: +54 9 11 1234-5678"
            placeholderTextColor={colors.placeholder}
            keyboardType="phone-pad"
            value={b.transitoTelefono}
            onChangeText={(transitoTelefono) => onCambio({ transitoTelefono })}
          />
        </View>

        <View style={styles.campo}>
          <Text style={styles.campoLabel}>Correo electrónico (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="contacto@transito.com"
            placeholderTextColor={colors.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
            value={b.transitoCorreo || ''}
            onChangeText={(transitoCorreo) => onCambio({ transitoCorreo })}
          />
        </View>
      </View>

      {/* Ficha Sanitaria */}
      <View style={styles.card}>
        <View style={styles.seccionHeader}>
          <MaterialIcons name="medical-services" size={20} color={colors.primary} />
          <Text style={styles.seccionTitulo}>Ficha Sanitaria Preliminar</Text>
        </View>

        <View style={styles.campo}>
          <Text style={styles.campoLabel}>¿Está castrado/a?</Text>
          <View style={styles.chipsRow}>
            {CASTRACION_OPCIONES.map((opcion) => (
              <Pressable
                key={opcion}
                style={[styles.chip, b.castrado === opcion && styles.chipActivo]}
                onPress={() => onCambio({ castrado: opcion })}
              >
                <Text
                  style={[
                    styles.chipTexto,
                    b.castrado === opcion && styles.chipActivoText,
                  ]}
                >
                  {ETIQUETA_CASTRACION[opcion]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.campo}>
          <Text style={styles.campoLabel}>Test Virales (VIF / ViLeF)</Text>
          <View style={[styles.chipsRow, { flexWrap: 'wrap' }]}>
            {VIRALES_OPCIONES.map((opcion) => (
              <Pressable
                key={opcion}
                style={[styles.chipSmall, b.virales === opcion && styles.chipActivo]}
                onPress={() => onCambio({ virales: opcion })}
              >
                <Text
                  style={[
                    styles.chipSmallText,
                    b.virales === opcion && styles.chipActivoText,
                  ]}
                >
                  {ETIQUETA_VIRALES[opcion]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Antecedentes y Estado Clínico */}
      <View style={styles.card}>
        <View style={styles.seccionHeader}>
          <MaterialIcons name="assignment" size={20} color={colors.primary} />
          <Text style={styles.seccionTitulo}>Historia y Personalidad</Text>
        </View>

        <View style={styles.campo}>
          <Text style={styles.campoLabel}>Historia / De dónde viene</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            multiline
            numberOfLines={3}
            placeholder="Antecedentes del hallazgo, colonia, rescate en techo, etc."
            placeholderTextColor={colors.placeholder}
            value={b.historiaOrigen}
            onChangeText={(historiaOrigen) => onCambio({ historiaOrigen })}
          />
        </View>

        <View style={styles.campo}>
          <Text style={styles.campoLabel}>Personalidad / Comportamiento</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Mimoso, convive con otros gatos, asustadizo"
            placeholderTextColor={colors.placeholder}
            value={b.personalidad}
            onChangeText={(personalidad) => onCambio({ personalidad })}
          />
        </View>

        <View style={styles.campo}>
          <Text style={styles.campoLabel}>Estado visible al rescatarlo</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Desnutrido, cuadro respiratorio, sin lesiones evidentes"
            placeholderTextColor={colors.placeholder}
            value={b.estadoVisible}
            onChangeText={(estadoVisible) => onCambio({ estadoVisible })}
          />
        </View>

        {/* Switch Urgencia */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitulo}>Marcar como caso urgente</Text>
            <Text style={styles.switchSub}>Requiere atención médica o traslado prioritario</Text>
          </View>
          <Switch
            value={b.esUrgente}
            onValueChange={(esUrgente) => onCambio({ esUrgente })}
            thumbColor={b.esUrgente ? colors.urgente : '#f4f3f4'}
            trackColor={{ false: '#767577', true: colors.urgenteBg }}
          />
        </View>
      </View>

      {intento && faltan.length > 0 && (
        <View style={styles.errorBox}>
          <MaterialIcons name="error-outline" size={18} color={colors.urgente} />
          <Text style={styles.errorText}>
            Completá los campos obligatorios: {faltan.join(', ')}.
          </Text>
        </View>
      )}

      {/* Botón de acción */}
      <Pressable style={styles.btnContinuar} onPress={continuar}>
        <Text style={styles.btnContinuarText}>Continuar a Confirmación</Text>
        <MaterialIcons name="arrow-forward" size={20} color={colors.onPrimary} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: { padding: 16, paddingBottom: 60, gap: 14 },
  stepper: { gap: 8, marginBottom: 4 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  volverText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  pasoActual: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  pasoSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSubtle },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  seccionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  seccionTitulo: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  fotoRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  foto: { width: 68, height: 68, borderRadius: 12, backgroundColor: colors.surfaceChip },
  fotoVacia: { alignItems: 'center', justifyContent: 'center' },
  campo: { gap: 6 },
  campoLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSubtle },
  input: {
    backgroundColor: colors.surfaceChip,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  inputMultiline: { minHeight: 64, textAlignVertical: 'top' },
  inputError: { borderWidth: 1, borderColor: colors.urgente },
  chipsRow: { flexDirection: 'row', gap: 8 },
  contadorRow: { flexDirection: 'row', gap: 8 },
  contadorChip: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surfaceChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorChipText: { fontFamily: fonts.bold, fontSize: 14, color: colors.textMuted },
  chip: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    backgroundColor: colors.surfaceChip,
  },
  chipSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surfaceChip,
    marginBottom: 4,
  },
  chipSmallText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted },
  chipEmoji: { fontSize: 16 },
  chipTexto: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  chipActivo: { backgroundColor: colors.primary },
  chipActivoText: { color: colors.onPrimary },
  btnGps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceCard,
  },
  btnGpsBuscando: { opacity: 0.6 },
  btnGpsText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  coordenadasInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' },
  coordenadasTexto: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  switchTitulo: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  switchSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSubtle },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.urgenteBg,
    padding: 12,
    borderRadius: 10,
  },
  errorText: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: colors.urgente },
  btnContinuar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 14,
    marginTop: 6,
  },
  btnContinuarText: { fontFamily: fonts.bold, fontSize: 15, color: colors.onPrimary },
});
