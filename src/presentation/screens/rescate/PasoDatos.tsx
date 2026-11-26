import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  COORDINADORES_FIJOS,
  Coordinador,
  Especie,
  ESPECIES_OTRO_SUGERIDAS,
  EstadoCastracion,
  EstadoVirales,
  ETIQUETA_CASTRACION,
  ETIQUETA_ESPECIE,
  ETIQUETA_RESULTADO_TEST,
  ETIQUETA_VIRALES,
  GravedadClinica,
  RegistroTestAnimal,
  ResultadoTestViral,
  testsPorEspecie,
  Vulnerabilidad,
} from '../../../domain/models/Caso';
import { BorradorRescate, faltantesDelRescate } from '../../../domain/models/Rescate';
import { calcularPrioridadCasoUseCase } from '../../../domain/usecases/CalcularPrioridadCasoUseCase';
import { PlanDesparasitacionCard } from '../../components/PlanDesparasitacionCard';
import { SelectorRelacionesAnimal } from '../../components/SelectorRelacionesAnimal';
import { useUbicacion } from '../../hooks/useUbicacion';
import { useCasoStore } from '../../stores/useCasoStore';
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

const GRAVEDADES: { key: GravedadClinica; label: string; desc: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: 'CRITICA', label: 'Crítica', desc: 'Atropellado, herido grave o viral agudo', icon: 'emergency' },
  { key: 'MODERADA', label: 'Moderada', desc: 'Sintomático o con lesión leve', icon: 'healing' },
  { key: 'LEVE', label: 'Leve', desc: 'Cuadro menor en observación', icon: 'visibility' },
  { key: 'SANA', label: 'Sana', desc: 'Sin signos clínicos aparentes', icon: 'verified' },
];

const VULNERABILIDADES: { key: Vulnerabilidad; label: string; desc: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: 'LACTANTE_SIN_MADRE', label: 'Lactante sin madre', desc: 'Requiere nodriza o mamadera', icon: 'child-care' },
  { key: 'SIN_TRANSITO', label: 'Sin tránsito', desc: 'Riesgo inminente de calle', icon: 'home-work' },
  { key: 'EN_TRATAMIENTO', label: 'En tratamiento', desc: 'Medicación o curaciones activas', icon: 'medication' },
  { key: 'ESTABLE', label: 'Estable', desc: 'Hogar asignado y seguro', icon: 'shield' },
];

const RESULTADOS_TEST_OPCIONES: ResultadoTestViral[] = ['PENDIENTE', 'NEGATIVO', 'POSITIVO', 'NO_APLICA'];

export function PasoDatos({ borrador: b, onCambio, onVolverAFoto, onContinuar }: Props) {
  const gps = useUbicacion();
  const casosExistentes = useCasoStore((s) => s.casos);
  const obtenerCoordinadores = useCasoStore((s) => s.obtenerCoordinadores);
  const [coordinadores, setCoordinadores] = useState<Coordinador[]>(COORDINADORES_FIJOS);
  const [intento, setIntento] = useState(false);
  const [fechasDespValidas, setFechasDespValidas] = useState(true);
  const [avisoGps, setAvisoGps] = useState<string | null>(null);
  const faltan = faltantesDelRescate(b);

  useEffect(() => {
    obtenerCoordinadores()
      .then((lista) => {
        if (lista.length > 0) setCoordinadores(lista);
      })
      .catch(() => {});
  }, [obtenerCoordinadores]);

  const usarGps = async () => {
    setAvisoGps(null);
    const r = await gps.obtener();
    if (r) {
      onCambio({
        coordenadas: r.coordenadas,
        ...(r.texto ? { barrio: r.texto } : {}),
      });
      if (r.sinBarrio) {
        setAvisoGps('Coordenadas GPS guardadas. Escribí el barrio manualmente porque no se pudo resolver la dirección.');
      }
    }
  };

  const ahoraVista = Date.now();
  const especieActual: Especie = b.especie ?? 'Gato';
  const testsPreview: RegistroTestAnimal[] = testsPorEspecie(especieActual).map((t) => ({
    id: t.id,
    casoId: 'preview',
    testId: t.id,
    resultado: b.resultadosTests?.[t.id] ?? 'PENDIENTE',
    updatedAt: ahoraVista,
  }));

  const prioridadVista = calcularPrioridadCasoUseCase.ejecutar({
    especie: especieActual,
    estadoCaso: 'EN_TRANSITO',
    gravedadClinica: b.gravedadClinica,
    vulnerabilidad: b.vulnerabilidad,
    fechaRescate: ahoraVista,
    sanidad: {
      castrado: b.castrado,
      virales: b.virales,
      fechaPrimeraDesparasitacion: b.fechaPrimeraDesparasitacion,
      fechaSegundaDesparasitacion: b.fechaSegundaDesparasitacion,
    },
    testsAnimal: testsPreview,
  });

  const continuar = () => {
    if (faltan.length || !fechasDespValidas) {
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
            <Text style={styles.campoLabel}>Nombre provisorio del animal *</Text>
            <TextInput
              style={[styles.input, intento && !b.nombreProvisorio.trim() && styles.inputError]}
              placeholder="Ej: Mora / Nube / Toby"
              placeholderTextColor={colors.placeholder}
              value={b.nombreProvisorio}
              onChangeText={(nombreProvisorio) => onCambio({ nombreProvisorio })}
            />
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
          {b.especie === 'Otro' && (
            <View style={{ gap: 8, marginTop: 6 }}>
              <Text style={styles.campoLabel}>¿Qué animal doméstico es? *</Text>
              <View style={styles.chipsRow}>
                {ESPECIES_OTRO_SUGERIDAS.map((sug) => {
                  const activa = (b.especieDetalle ?? '').trim().toLowerCase() === sug.toLowerCase();
                  return (
                    <Pressable
                      key={sug}
                      style={[styles.chip, activa && styles.chipActivo]}
                      onPress={() => onCambio({ especieDetalle: sug })}
                    >
                      <Text style={[styles.chipTexto, activa && styles.chipActivoText]}>{sug}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                style={[styles.input, intento && !b.especieDetalle?.trim() && styles.inputError]}
                placeholder="Especificá el animal (ej: Conejo, cobayo, canario, tortuga...)"
                placeholderTextColor={colors.placeholder}
                value={b.especieDetalle ?? ''}
                onChangeText={(especieDetalle) => onCambio({ especieDetalle })}
              />
            </View>
          )}
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

        {/* Parentesco / vínculos con otros animales (opcional) */}
        <View style={styles.campo}>
          <Text style={styles.campoLabel}>Parentesco / Camada con otros animales (opcional)</Text>
          <SelectorRelacionesAnimal
            relaciones={b.relacionesIniciales ?? []}
            casosDisponibles={casosExistentes}
            onAgregar={(rel) =>
              onCambio({
                relacionesIniciales: [...(b.relacionesIniciales ?? []), rel],
              })
            }
            onQuitar={(idx) =>
              onCambio({
                relacionesIniciales: (b.relacionesIniciales ?? []).filter((_, i) => i !== idx),
              })
            }
          />
        </View>
      </View>

      {/* Evaluación de Urgencia y Triaje Clínico */}
      <View style={styles.card}>
        <View style={styles.seccionHeader}>
          <MaterialIcons name="medical-services" size={20} color={colors.primary} />
          <Text style={styles.seccionTitulo}>Triaje y Priorización Multicriterio</Text>
        </View>

        {/* Banner de Prioridad Calculada en Vivo */}
        <View
          style={[
            styles.bannerPrioridad,
            prioridadVista.nivelPrioridad === 'URGENTE'
              ? styles.bannerUrgente
              : prioridadVista.nivelPrioridad === 'ATENCION'
              ? styles.bannerAtencion
              : styles.bannerAldia,
          ]}
        >
          <MaterialIcons
            name={
              prioridadVista.nivelPrioridad === 'URGENTE'
                ? 'error'
                : prioridadVista.nivelPrioridad === 'ATENCION'
                ? 'schedule'
                : 'check-circle'
            }
            size={20}
            color={
              prioridadVista.nivelPrioridad === 'URGENTE'
                ? colors.urgente
                : prioridadVista.nivelPrioridad === 'ATENCION'
                ? colors.atencion
                : colors.aldia
            }
          />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.bannerTitulo,
                {
                  color:
                    prioridadVista.nivelPrioridad === 'URGENTE'
                      ? colors.urgenteText
                      : prioridadVista.nivelPrioridad === 'ATENCION'
                      ? colors.atencionText
                      : colors.aldiaText,
                },
              ]}
            >
              {prioridadVista.motivoUrgencia}
            </Text>
            <Text style={styles.bannerSub}>
              Puntaje de ordenamiento: {prioridadVista.puntajePrioridad} pts
            </Text>
          </View>
        </View>

        {/* Gravedad Clínica */}
        <View style={styles.campo}>
          <Text style={styles.campoLabel}>Gravedad Clínica al ingreso *</Text>
          <View style={styles.chipsColumna}>
            {GRAVEDADES.map((g) => {
              const seleccionado = b.gravedadClinica === g.key;
              return (
                <Pressable
                  key={g.key}
                  style={[styles.chipTactil, seleccionado && styles.chipTactilActivo]}
                  onPress={() => onCambio({ gravedadClinica: g.key, esUrgente: g.key === 'CRITICA' })}
                  accessibilityRole="button"
                >
                  <MaterialIcons
                    name={g.icon}
                    size={22}
                    color={seleccionado ? colors.onPrimary : colors.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.chipTactilTitulo,
                        seleccionado && styles.chipTactilTituloActivo,
                      ]}
                    >
                      {g.label}
                    </Text>
                    <Text
                      style={[
                        styles.chipTactilSub,
                        seleccionado && styles.chipTactilSubActivo,
                      ]}
                    >
                      {g.desc}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Vulnerabilidad */}
        <View style={styles.campo}>
          <Text style={styles.campoLabel}>Condición de Vulnerabilidad *</Text>
          <View style={styles.chipsColumna}>
            {VULNERABILIDADES.map((v) => {
              const seleccionado = b.vulnerabilidad === v.key;
              return (
                <Pressable
                  key={v.key}
                  style={[styles.chipTactil, seleccionado && styles.chipTactilActivo]}
                  onPress={() => onCambio({ vulnerabilidad: v.key })}
                  accessibilityRole="button"
                >
                  <MaterialIcons
                    name={v.icon}
                    size={22}
                    color={seleccionado ? colors.onPrimary : colors.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.chipTactilTitulo,
                        seleccionado && styles.chipTactilTituloActivo,
                      ]}
                    >
                      {v.label}
                    </Text>
                    <Text
                      style={[
                        styles.chipTactilSub,
                        seleccionado && styles.chipTactilSubActivo,
                      ]}
                    >
                      {v.desc}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
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
        {!!avisoGps && (
          <Text style={[styles.coordenadasTexto, { color: colors.atencionText }]}>{avisoGps}</Text>
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
            {coordinadores.map((coord) => {
              const activo =
                (b.coordinadorId && b.coordinadorId === coord.id) ||
                (!b.coordinadorId && b.quienSigueCaso === coord.nombre);
              return (
                <Pressable
                  key={coord.id}
                  style={[styles.chip, activo && styles.chipActivo]}
                  onPress={() => onCambio({ quienSigueCaso: coord.nombre, coordinadorId: coord.id })}
                >
                  <Text
                    style={[
                      styles.chipTexto,
                      activo && styles.chipActivoText,
                    ]}
                  >
                    {coord.nombre}
                  </Text>
                </Pressable>
              );
            })}
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
          <Text style={styles.campoLabel}>Teléfono del tránsito (WhatsApp)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: +54 9 11 1234-5678"
            placeholderTextColor={colors.placeholder}
            keyboardType="phone-pad"
            value={b.transitoTelefono}
            onChangeText={(transitoTelefono) => onCambio({ transitoTelefono })}
          />
        </View>
      </View>

      {/* Tarjeta Sanitaria Inicial */}
      <View style={styles.card}>
        <View style={styles.seccionHeader}>
          <MaterialIcons name="healing" size={20} color={colors.primary} />
          <Text style={styles.seccionTitulo}>Ficha Sanitaria Inicial</Text>
        </View>

        <View style={styles.campo}>
          <Text style={styles.campoLabel}>Estado de Castración</Text>
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

        {b.especie === 'Gato' || !b.especie ? (
          <View style={styles.campo}>
            <Text style={styles.campoLabel}>Test VIF / ViLeF (Leucemia e Inmuno)</Text>
            <View style={{ gap: 6 }}>
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
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={styles.campoLabel}>
              {b.especie === 'Perro'
                ? 'Tests caninos (Parvovirus / Moquillo)'
                : 'Control clínico y estudios generales'}
            </Text>
            {testsPorEspecie(b.especie).map((t) => {
              const valorActual = b.resultadosTests?.[t.id] ?? 'PENDIENTE';
              return (
                <View key={t.id} style={{ gap: 6 }}>
                  <Text style={styles.coordenadasTexto}>{t.nombre}</Text>
                  <View style={styles.chipsRow}>
                    {RESULTADOS_TEST_OPCIONES.map((res) => {
                      const activo = valorActual === res;
                      return (
                        <Pressable
                          key={res}
                          style={[styles.chip, activo && styles.chipActivo]}
                          onPress={() =>
                            onCambio({
                              resultadosTests: {
                                ...(b.resultadosTests ?? {}),
                                [t.id]: res,
                              },
                            })
                          }
                        >
                          <Text style={[styles.chipTexto, activo && styles.chipActivoText]}>
                            {ETIQUETA_RESULTADO_TEST[res]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <PlanDesparasitacionCard
          fechaPrimera={b.fechaPrimeraDesparasitacion}
          fechaSegunda={b.fechaSegundaDesparasitacion}
          onChangePrimera={(fechaPrimeraDesparasitacion) => onCambio({ fechaPrimeraDesparasitacion })}
          onChangeSegunda={(fechaSegundaDesparasitacion) => onCambio({ fechaSegundaDesparasitacion })}
          onValidityChange={setFechasDespValidas}
          titulo="Plan de Desparasitación (opcional)"
        />
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
      </View>

      {intento && (faltan.length > 0 || !fechasDespValidas) && (
        <View style={styles.errorBox}>
          <MaterialIcons name="error-outline" size={18} color={colors.urgente} />
          <Text style={styles.errorText}>
            {faltan.length > 0
              ? `Completá los campos obligatorios: ${faltan.join(', ')}.`
              : 'Revisá las fechas exactas de desparasitación (DD/MM/AAAA).'}
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
  chipsColumna: { gap: 8 },
  chipTactil: {
    minHeight: 52, // Accesible > 48dp
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surfaceChip,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipTactilActivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipTactilTitulo: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  chipTactilTituloActivo: {
    color: colors.onPrimary,
  },
  chipTactilSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  chipTactilSubActivo: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  bannerPrioridad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerUrgente: {
    backgroundColor: colors.urgenteBg,
    borderColor: colors.urgente,
  },
  bannerAtencion: {
    backgroundColor: colors.atencionBg,
    borderColor: colors.atencion,
  },
  bannerAldia: {
    backgroundColor: colors.aldiaBg,
    borderColor: colors.aldia,
  },
  bannerTitulo: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  bannerSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  contadorRow: { flexDirection: 'row', gap: 8 },
  contadorChip: {
    flex: 1,
    height: 48, // Accesible > 48dp
    borderRadius: 10,
    backgroundColor: colors.surfaceChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorChipText: { fontFamily: fonts.bold, fontSize: 14, color: colors.textMuted },
  chip: {
    flex: 1,
    height: 48, // Accesible > 48dp
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    backgroundColor: colors.surfaceChip,
  },
  chipSmall: {
    minHeight: 48, // Accesible > 48dp
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceChip,
    marginBottom: 4,
  },
  chipSmallText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  chipEmoji: { fontSize: 16 },
  chipTexto: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  chipActivo: { backgroundColor: colors.primary },
  chipActivoText: { color: colors.onPrimary },
  btnGps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceCard,
  },
  btnGpsBuscando: { opacity: 0.6 },
  btnGpsText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  coordenadasInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' },
  coordenadasTexto: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
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
    minHeight: 52,
    backgroundColor: colors.primary,
    borderRadius: 14,
    marginTop: 6,
  },
  btnContinuarText: { fontFamily: fonts.bold, fontSize: 15, color: colors.onPrimary },
});
