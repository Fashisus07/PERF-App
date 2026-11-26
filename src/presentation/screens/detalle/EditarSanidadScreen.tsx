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
  EstadoCastracion,
  EstadoVirales,
  ETIQUETA_CASTRACION,
  ETIQUETA_GRAVEDAD,
  ETIQUETA_RESULTADO_TEST,
  ETIQUETA_VIRALES,
  ETIQUETA_VULNERABILIDAD,
  GravedadClinica,
  RegistroTestAnimal,
  ResultadoTestViral,
  especieLegible,
  testsPorEspecie,
  Vulnerabilidad,
} from '../../../domain/models/Caso';
import { generarUUID } from '../../../data/local/uuid';
import { casoRepository } from '../../../di/container';
import { resumenSanidad } from '../../../domain/services/AnimalesDelCaso';
import { calcularPrioridadCasoUseCase } from '../../../domain/usecases/CalcularPrioridadCasoUseCase';
import { PlanDesparasitacionCard } from '../../components/PlanDesparasitacionCard';
import { StackHeader } from '../../components/StackHeader';
import { obtenerAjustes } from '../../hooks/useAjustes';
import { useAnimales } from '../../hooks/useAnimales';
import { useCaso } from '../../hooks/useCaso';
import { useCasoStore } from '../../stores/useCasoStore';
import { colors, fonts } from '../../theme';

type Props = {
  route?: { params?: { casoId: string; foco?: 'triaje' | 'sanidad' } };
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

const OPCIONES_GRAVEDAD: {
  key: GravedadClinica;
  label: string;
  desc: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  { key: 'CRITICA', label: 'Crítica', desc: 'Atropellado, herido grave o viral agudo', icon: 'emergency' },
  { key: 'MODERADA', label: 'Moderada', desc: 'Sintomático o con lesión en observación', icon: 'healing' },
  { key: 'LEVE', label: 'Leve', desc: 'Cuadro menor en seguimiento', icon: 'visibility' },
  { key: 'SANA', label: 'Sana', desc: 'Sin signos clínicos aparentes', icon: 'verified' },
];

const OPCIONES_VULNERABILIDAD: {
  key: Vulnerabilidad;
  label: string;
  desc: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  { key: 'LACTANTE_SIN_MADRE', label: 'Lactante sin madre', desc: 'Requiere nodriza o mamadera', icon: 'child-care' },
  { key: 'SIN_TRANSITO', label: 'Sin tránsito', desc: 'Sin hogar de tránsito asignado', icon: 'home-work' },
  { key: 'EN_TRATAMIENTO', label: 'En tratamiento', desc: 'Medicación o curaciones activas', icon: 'medication' },
  { key: 'ESTABLE', label: 'Estable', desc: 'Hogar asignado y seguro', icon: 'shield' },
];

export function EditarSanidadScreen({ route, navigation }: Props) {
  const { bottom } = useSafeAreaInsets();
  const casoId = route?.params?.casoId ?? '';
  const { caso, cargando } = useCaso(casoId);
  const actualizarCaso = useCasoStore((s) => s.actualizarCaso);
  const agregarEventoHistorial = useCasoStore((s) => s.agregarEventoHistorial);
  const cargarDetalleCaso = useCasoStore((s) => s.cargarDetalleCaso);
  const guardarResultadoTest = useCasoStore((s) => s.guardarResultadoTest);
  const { animales } = useAnimales(casoId);
  // Si hay varios animales en el mismo caso (camada legacy) se elige uno por vez; con 1 solo se edita todo junto.
  const varios = animales.length > 1;
  const [animalId, setAnimalId] = useState<string | null>(null);
  const animalActual = varios ? animales.find((a) => a.id === animalId) ?? animales[0] : animales[0];
  const animal = varios ? animalActual : undefined;

  const [umbralDias, setUmbralDias] = useState(15);
  const [gravedad, setGravedad] = useState<GravedadClinica | null>(null);
  const [vulnerabilidad, setVulnerabilidad] = useState<Vulnerabilidad | null>(null);
  const [castrado, setCastrado] = useState<EstadoCastracion | null>(null);
  const [virales, setVirales] = useState<EstadoVirales | null>(null);
  const [testsDraft, setTestsDraft] = useState<Record<string, ResultadoTestViral>>({});
  const [desp1Fecha, setDesp1Fecha] = useState<number | null | undefined>(undefined);
  const [desp2Fecha, setDesp2Fecha] = useState<number | null | undefined>(undefined);
  const [fechasValidas, setFechasValidas] = useState(true);
  const [estadoVisible, setEstadoVisible] = useState<string | null>(null);
  const [animalNombreDraft, setAnimalNombreDraft] = useState<string | null>(null);
  const [pesoDraft, setPesoDraft] = useState<string | null>(null);
  const [embarazadaDraft, setEmbarazadaDraft] = useState<boolean | null>(null);
  const [fallecidoDraft, setFallecidoDraft] = useState<boolean | null>(null);
  const [motivoFallecimientoDraft, setMotivoFallecimientoDraft] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    obtenerAjustes()
      .then((a) => setUmbralDias(a.umbralUrgenteDias))
      .catch(() => {});
  }, []);

  // Valores inicializados con los del animal elegido (si hay varios) o del caso si no fueron tocados
  const fuente = animal
    ? {
        castrado: animal.castrado,
        virales: animal.virales,
        d1: animal.fechaPrimeraDesparasitacion,
        d2: animal.fechaSegundaDesparasitacion,
      }
    : {
        castrado: caso?.sanidad?.castrado,
        virales: caso?.sanidad?.virales,
        d1: caso?.sanidad?.fechaPrimeraDesparasitacion,
        d2: caso?.sanidad?.fechaSegundaDesparasitacion,
      };
  const valorGravedad = gravedad ?? caso?.gravedadClinica ?? 'MODERADA';
  const valorVulnerabilidad = vulnerabilidad ?? caso?.vulnerabilidad ?? 'ESTABLE';
  const valorCastrado = castrado ?? fuente.castrado ?? 'PENDIENTE';
  const valorVirales = virales ?? fuente.virales ?? 'PENDIENTE';
  const fechaDesp1 = desp1Fecha !== undefined ? desp1Fecha : fuente.d1 ?? null;
  const fechaDesp2 = desp2Fecha !== undefined ? desp2Fecha : fuente.d2 ?? null;
  const valorNombreAnimal = animalNombreDraft ?? animalActual?.nombre ?? caso?.nombreProvisorio ?? '';
  const valorPesoTexto = pesoDraft !== null ? pesoDraft : animalActual?.pesoGramos != null ? String(animalActual.pesoGramos) : '';
  const pesoLimpio = valorPesoTexto.trim();
  const pesoValido = !pesoLimpio || /^\d+$/.test(pesoLimpio);
  const valorPesoGramos = pesoLimpio && /^\d+$/.test(pesoLimpio) ? Number(pesoLimpio) : null;
  const valorEmbarazada = embarazadaDraft ?? animalActual?.embarazada ?? false;
  const valorFallecido = fallecidoDraft ?? animalActual?.fallecido ?? false;
  const valorMotivoFallecimiento = motivoFallecimientoDraft ?? animalActual?.motivoFallecimiento ?? '';

  const testsDeEspecie = caso ? testsPorEspecie(caso.especie) : [];
  const resultadoTestActual = (testId: string): ResultadoTestViral => {
    if (testsDraft[testId]) return testsDraft[testId];
    const deEsteAnimal = animal
      ? caso?.testsAnimal?.find((t) => t.animalId === animal.id && t.testId === testId)
      : undefined;
    const general = caso?.testsAnimal?.find((t) => !t.animalId && t.testId === testId)
      ?? caso?.testsAnimal?.find((t) => t.testId === testId);
    return (deEsteAnimal ?? general)?.resultado ?? 'PENDIENTE';
  };
  const testsPreview: RegistroTestAnimal[] = caso
    ? testsDeEspecie.map((t) => {
        let res = resultadoTestActual(t.id);
        if (caso.especie === 'Gato') {
          if (valorVirales === 'AMBOS_POSITIVOS') res = 'POSITIVO';
          else if (valorVirales === 'NEGATIVO') res = 'NEGATIVO';
          else if (t.id === 'vif') res = valorVirales === 'VIF_POSITIVO' ? 'POSITIVO' : valorVirales === 'VILEF_POSITIVO' ? 'NEGATIVO' : 'PENDIENTE';
          else if (t.id === 'vilef') res = valorVirales === 'VILEF_POSITIVO' ? 'POSITIVO' : valorVirales === 'VIF_POSITIVO' ? 'NEGATIVO' : 'PENDIENTE';
        }
        const existente = animal
          ? caso.testsAnimal?.find((r) => r.animalId === animal.id && r.testId === t.id)
          : caso.testsAnimal?.find((r) => !r.animalId && r.testId === t.id) ?? caso.testsAnimal?.find((r) => r.testId === t.id);
        return {
          id: existente?.id ?? t.id,
          casoId: caso.id,
          animalId: animal ? animal.id : null,
          testId: t.id,
          resultado: res,
          updatedAt: Date.now(),
        };
      })
    : [];

  const elegirAnimal = (id: string) => {
    setAnimalId(id);
    setCastrado(null);
    setVirales(null);
    setTestsDraft({});
    setDesp1Fecha(undefined);
    setDesp2Fecha(undefined);
    setAnimalNombreDraft(null);
    setPesoDraft(null);
    setEmbarazadaDraft(null);
    setFallecidoDraft(null);
    setMotivoFallecimientoDraft(null);
  };
  const textoVisible = estadoVisible !== null ? estadoVisible : caso?.estadoVisible ?? '';

  const ahoraPreview = Date.now();
  const sanidadPreview = {
    castrado: valorCastrado,
    virales: valorVirales,
    fechaPrimeraDesparasitacion: fechaDesp1,
    fechaSegundaDesparasitacion: fechaDesp2,
  };
  const sanidadGrupoPreview =
    varios && animal
      ? resumenSanidad(
          animales.map((a) => (a.id === animal.id ? { ...a, ...sanidadPreview } : a))
        ) ?? sanidadPreview
      : sanidadPreview;

  const prioridadVista = caso
    ? calcularPrioridadCasoUseCase.ejecutar(
        {
          especie: caso.especie,
          estadoCaso: caso.estadoCaso,
          gravedadClinica: valorGravedad,
          vulnerabilidad: valorVulnerabilidad,
          fechaRescate: caso.fechaRescate,
          fechaUltimaRevision: caso.fechaUltimaRevision,
          sanidad: sanidadGrupoPreview,
          testsAnimal: testsPreview,
        },
        umbralDias,
        ahoraPreview
      )
    : null;

  const handleGuardar = async () => {
    if (!caso) return;
    if (!fechasValidas) {
      setErrorMsg('Revisá las fechas de desparasitación (formato DD/MM/AAAA).');
      return;
    }
    if (!pesoValido) {
      setErrorMsg('Ingresá el peso en gramos usando solo números enteros (ej: 3200).');
      return;
    }
    setGuardando(true);
    setErrorMsg(null);
    try {
      const ahora = Date.now();
      const despTexto1 = fechaDesp1 ? new Date(fechaDesp1).toLocaleDateString('es-AR') : 'Pendiente';
      const despTexto2 = fechaDesp2 ? new Date(fechaDesp2).toLocaleDateString('es-AR') : 'Pendiente';
      const resumenTestsTexto =
        caso.especie === 'Gato'
          ? `Virales: ${ETIQUETA_VIRALES[valorVirales]}`
          : testsDeEspecie
              .map((t) => `${t.nombre.split(' ')[0]}: ${ETIQUETA_RESULTADO_TEST[resultadoTestActual(t.id)]}`)
              .join(' · ');

      if (animal) {
        // Ficha individual dentro de una camada: persiste todos los campos del animal y sus tests por especie.
        const nombreFinal = valorNombreAnimal.trim() || animal.nombre;
        await casoRepository.actualizarAnimal({
          ...animal,
          nombre: nombreFinal,
          castrado: valorCastrado,
          virales: valorVirales,
          pesoGramos: valorPesoGramos,
          embarazada: valorEmbarazada,
          fechaPrimeraDesparasitacion: fechaDesp1,
          fechaSegundaDesparasitacion: fechaDesp2,
          fallecido: valorFallecido,
          motivoFallecimiento: valorFallecido ? valorMotivoFallecimiento.trim() || null : null,
        });

        const otrosTests = (caso.testsAnimal ?? []).filter(
          (r) => !(r.animalId === animal.id && testsPreview.some((tp) => tp.testId === r.testId))
        );
        const testsAnimalGuardados: RegistroTestAnimal[] = [...otrosTests];
        for (const tp of testsPreview) {
          const existente = (caso.testsAnimal ?? []).find(
            (r) => r.animalId === animal.id && r.testId === tp.testId
          );
          const reg = await guardarResultadoTest({
            ...tp,
            id: existente?.id ?? generarUUID(),
            animalId: animal.id,
            fechaTest: tp.resultado === 'PENDIENTE' ? null : ahora,
            updatedAt: ahora,
          });
          testsAnimalGuardados.push(reg);
        }

        const fresco = await casoRepository.obtenerPorId(caso.id);
        const base = fresco ?? caso;
        const cambioDatosCaso =
          base.gravedadClinica !== valorGravedad ||
          base.vulnerabilidad !== valorVulnerabilidad ||
          base.estadoVisible !== textoVisible.trim();

        const prioFinal = calcularPrioridadCasoUseCase.ejecutar(
          {
            especie: base.especie,
            estadoCaso: base.estadoCaso,
            gravedadClinica: valorGravedad,
            vulnerabilidad: valorVulnerabilidad,
            fechaRescate: base.fechaRescate,
            fechaUltimaRevision: base.fechaUltimaRevision,
            sanidad: base.sanidad,
            testsAnimal: testsAnimalGuardados,
          },
          umbralDias,
          ahora
        );

        if (cambioDatosCaso) {
          await actualizarCaso({
            ...base,
            gravedadClinica: valorGravedad,
            vulnerabilidad: valorVulnerabilidad,
            estadoVisible: textoVisible.trim(),
            testsAnimal: testsAnimalGuardados,
            nivelPrioridad: prioFinal.nivelPrioridad,
            motivoUrgencia: prioFinal.motivoUrgencia,
            puntajePrioridad: prioFinal.puntajePrioridad,
            esUrgente: prioFinal.esUrgente,
          });
        }

        const detallesIndiv: string[] = [];
        if (valorPesoGramos != null) detallesIndiv.push(`Peso: ${valorPesoGramos}g`);
        if (valorEmbarazada) detallesIndiv.push('Embarazada');
        if (valorFallecido) {
          detallesIndiv.push(valorMotivoFallecimiento.trim() ? `Fallecido (${valorMotivoFallecimiento.trim()})` : 'Fallecido');
        }

        const resumenAnimal = [
          `Animal: ${nombreFinal}`,
          `Gravedad: ${ETIQUETA_GRAVEDAD[valorGravedad]}`,
          `Vulnerabilidad: ${ETIQUETA_VULNERABILIDAD[valorVulnerabilidad]}`,
          `Castración: ${ETIQUETA_CASTRACION[valorCastrado]}`,
          resumenTestsTexto,
          `1° Desp.: ${despTexto1}`,
          `2° Desp.: ${despTexto2}`,
          ...detallesIndiv,
          `Prioridad: ${prioFinal.motivoUrgencia} (${prioFinal.puntajePrioridad} pts)`,
        ].join(' · ');

        await agregarEventoHistorial(caso.id, 'TRATAMIENTO', `Actualización médico-sanitaria (${nombreFinal}): ${resumenAnimal}`).catch(
          () => {}
        );
        await cargarDetalleCaso(caso.id);
        navigation?.navigate?.('DetalleCaso', { casoId: caso.id, estadoActualizado: true });
        return;
      }

      const nuevaSanidad = {
        ...caso.sanidad,
        castrado: valorCastrado,
        virales: valorVirales,
        fechaPrimeraDesparasitacion: fechaDesp1,
        fechaSegundaDesparasitacion: fechaDesp2,
      };

      const prioridad = calcularPrioridadCasoUseCase.ejecutar(
        {
          especie: caso.especie,
          estadoCaso: caso.estadoCaso,
          gravedadClinica: valorGravedad,
          vulnerabilidad: valorVulnerabilidad,
          fechaRescate: caso.fechaRescate,
          fechaUltimaRevision: caso.fechaUltimaRevision,
          sanidad: nuevaSanidad,
          testsAnimal: testsPreview,
        },
        umbralDias,
        ahora
      );

      const testsGuardados: RegistroTestAnimal[] = [];
      for (const tp of testsPreview) {
        const reg = await guardarResultadoTest({
          ...tp,
          id: caso.testsAnimal?.find((r) => !r.animalId && r.testId === tp.testId)?.id
            ?? caso.testsAnimal?.find((r) => r.testId === tp.testId)?.id
            ?? generarUUID(),
          animalId: null,
          fechaTest: tp.resultado === 'PENDIENTE' ? null : ahora,
          updatedAt: ahora,
        });
        testsGuardados.push(reg);
      }

      const casoActualizado = {
        ...caso,
        gravedadClinica: valorGravedad,
        vulnerabilidad: valorVulnerabilidad,
        estadoVisible: textoVisible.trim(),
        sanidad: nuevaSanidad,
        testsAnimal: testsGuardados,
        nivelPrioridad: prioridad.nivelPrioridad,
        motivoUrgencia: prioridad.motivoUrgencia,
        puntajePrioridad: prioridad.puntajePrioridad,
        esUrgente: prioridad.esUrgente,
      };

      await actualizarCaso(casoActualizado);

      if (animalActual) {
        await casoRepository.actualizarAnimal({
          ...animalActual,
          castrado: valorCastrado,
          virales: valorVirales,
          pesoGramos: valorPesoGramos,
          embarazada: valorEmbarazada,
          fechaPrimeraDesparasitacion: fechaDesp1,
          fechaSegundaDesparasitacion: fechaDesp2,
          fallecido: valorFallecido,
          motivoFallecimiento: valorFallecido ? valorMotivoFallecimiento.trim() || null : null,
        });
      }

      const extrasResumen: string[] = [];
      if (valorPesoGramos != null) extrasResumen.push(`Peso: ${valorPesoGramos}g`);
      if (valorEmbarazada) extrasResumen.push('Embarazada');
      if (valorFallecido) {
        extrasResumen.push(valorMotivoFallecimiento.trim() ? `Fallecido (${valorMotivoFallecimiento.trim()})` : 'Fallecido');
      }

      const resumenCambios = [
        `Gravedad: ${ETIQUETA_GRAVEDAD[valorGravedad]}`,
        `Vulnerabilidad: ${ETIQUETA_VULNERABILIDAD[valorVulnerabilidad]}`,
        `Castración: ${ETIQUETA_CASTRACION[valorCastrado]}`,
        resumenTestsTexto,
        `1° Desp.: ${despTexto1}`,
        `2° Desp.: ${despTexto2}`,
        ...extrasResumen,
        `Prioridad: ${prioridad.motivoUrgencia} (${prioridad.puntajePrioridad} pts)`,
      ].join(' · ');

      await agregarEventoHistorial(caso.id, 'TRATAMIENTO', `Actualización médico-sanitaria: ${resumenCambios}`).catch(
        () => {}
      );

      navigation?.navigate?.('DetalleCaso', { casoId: caso.id, estadoActualizado: true });
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error al guardar la ficha sanitaria');
      setGuardando(false);
    }
  };

  if (cargando || !caso) {
    return (
      <View style={styles.screen}>
        <StackHeader titulo="Ficha Clínica y Sanidad" onBack={() => navigation?.goBack?.()} />
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
      <StackHeader titulo="Ficha Clínica y Sanidad" onBack={() => navigation?.goBack?.()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Banner de Identificación del Paciente */}
        <View style={styles.pacienteCard}>
          <View style={styles.pacienteIcono}>
            <MaterialIcons name="pets" size={24} color={colors.primary} />
          </View>
          <View style={styles.pacienteInfo}>
            <Text style={styles.pacienteNombre}>{animal ? animal.nombre : caso.nombreProvisorio}</Text>
            <Text style={styles.pacienteSub}>
              {caso.especie} · {caso.barrio} · {caso.edadEstimada || 'Edad no informada'}
            </Text>
          </View>
        </View>

        {varios ? (
          <View style={styles.seccionCard}>
            <View style={styles.seccionHeader}>
              <MaterialIcons name="pets" size={20} color={colors.primary} />
              <Text style={styles.seccionTitulo}>¿De qué animal es la ficha?</Text>
            </View>
            <Text style={styles.seccionDesc}>La ficha sanitaria es de cada animal. Guardá antes de cambiar de uno a otro.</Text>
            <View style={styles.chipsRow}>
              {animales.map((a) => {
                const activo = animal?.id === a.id;
                return (
                  <Pressable key={a.id} style={[styles.chip, activo && styles.chipActivo]} onPress={() => elegirAnimal(a.id)}>
                    {activo && <MaterialIcons name="check" size={16} color={colors.onPrimary} />}
                    <Text style={[styles.chipText, activo && styles.chipTextActivo]}>{a.nombre}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Vista en vivo de cómo impactan los cambios en Triaje Multicriterio */}
        {prioridadVista && (
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
              size={22}
              color={
                prioridadVista.nivelPrioridad === 'URGENTE'
                  ? colors.urgente
                  : prioridadVista.nivelPrioridad === 'ATENCION'
                  ? colors.atencion
                  : colors.aldia
              }
            />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.bannerEyebrow}>Triaje resultante en tiempo real</Text>
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
                Puntaje multicriterio: {prioridadVista.puntajePrioridad} pts
              </Text>
            </View>
          </View>
        )}

        {errorMsg ? (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={20} color={colors.urgente} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Sección Estado de Salud / Gravedad Clínica */}
        <View style={styles.seccionCard}>
          <View style={styles.seccionHeader}>
            <MaterialIcons name="health-and-safety" size={20} color={colors.primary} />
            <Text style={styles.seccionTitulo}>Estado de Salud (Gravedad Clínica)</Text>
          </View>
          <Text style={styles.seccionDesc}>
            Refleja la situación clínica actual del animal para recalcular su prioridad en la lista.
          </Text>

          <View style={styles.triajeList}>
            {OPCIONES_GRAVEDAD.map((g) => {
              const seleccionado = valorGravedad === g.key;
              return (
                <Pressable
                  key={g.key}
                  style={[styles.triajeChip, seleccionado && styles.triajeChipActivo]}
                  onPress={() => setGravedad(g.key)}
                  accessibilityRole="button"
                >
                  <MaterialIcons
                    name={g.icon}
                    size={22}
                    color={seleccionado ? colors.onPrimary : colors.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.triajeTitulo, seleccionado && styles.triajeTextoActivo]}>
                      {g.label}
                    </Text>
                    <Text style={[styles.triajeSub, seleccionado && styles.triajeSubActivo]}>
                      {g.desc}
                    </Text>
                  </View>
                  {seleccionado && <MaterialIcons name="check" size={18} color={colors.onPrimary} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Sección Condición de Vulnerabilidad */}
        <View style={styles.seccionCard}>
          <View style={styles.seccionHeader}>
            <MaterialIcons name="shield" size={20} color={colors.primary} />
            <Text style={styles.seccionTitulo}>Condición de Vulnerabilidad</Text>
          </View>
          <Text style={styles.seccionDesc}>
            Define si requiere hogar urgente, cuidados de lactancia o tratamiento médico activo.
          </Text>

          <View style={styles.triajeList}>
            {OPCIONES_VULNERABILIDAD.map((v) => {
              const seleccionado = valorVulnerabilidad === v.key;
              return (
                <Pressable
                  key={v.key}
                  style={[styles.triajeChip, seleccionado && styles.triajeChipActivo]}
                  onPress={() => setVulnerabilidad(v.key)}
                  accessibilityRole="button"
                >
                  <MaterialIcons
                    name={v.icon}
                    size={22}
                    color={seleccionado ? colors.onPrimary : colors.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.triajeTitulo, seleccionado && styles.triajeTextoActivo]}>
                      {v.label}
                    </Text>
                    <Text style={[styles.triajeSub, seleccionado && styles.triajeSubActivo]}>
                      {v.desc}
                    </Text>
                  </View>
                  {seleccionado && <MaterialIcons name="check" size={18} color={colors.onPrimary} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Sección Castración */}
        <View style={styles.seccionCard}>
          <View style={styles.seccionHeader}>
            <MaterialIcons name="healing" size={20} color={colors.primary} />
            <Text style={styles.seccionTitulo}>Estado de Castración</Text>
          </View>
          <Text style={styles.seccionDesc}>
            Prioritario para corte de celos, preñeces no deseadas y habilitación para adopción.
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

        {/* Sección Virales / Estudios por especie */}
        {caso.especie === 'Gato' ? (
          <View style={styles.seccionCard}>
            <View style={styles.seccionHeader}>
              <MaterialIcons name="biotech" size={20} color={colors.primary} />
              <Text style={styles.seccionTitulo}>Serología Virales (VIF / ViLeF)</Text>
            </View>
            <Text style={styles.seccionDesc}>
              Los casos positivos (en especial ViLeF) elevan automáticamente la prioridad veterinaria y de aislamiento.
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
        ) : (
          <View style={styles.seccionCard}>
            <View style={styles.seccionHeader}>
              <MaterialIcons name="biotech" size={20} color={colors.primary} />
              <Text style={styles.seccionTitulo}>Estudios y Tests ({especieLegible(caso)})</Text>
            </View>
            <Text style={styles.seccionDesc}>
              {caso.especie === 'Perro'
                ? 'Resultados fijos de Parvovirus y Moquillo / Distemper registrados en la ficha.'
                : 'Control clínico y estudios veterinarios generales del animal.'}
            </Text>
            {testsDeEspecie.map((t) => {
              const valorActual = resultadoTestActual(t.id);
              return (
                <View key={t.id} style={{ gap: 8, marginTop: 6 }}>
                  <Text style={styles.radioLabel}>{t.nombre}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {(['PENDIENTE', 'NEGATIVO', 'POSITIVO', 'NO_APLICA'] as ResultadoTestViral[]).map((res) => {
                      const activo = valorActual === res;
                      const esPos = res === 'POSITIVO';
                      return (
                        <Pressable
                          key={res}
                          style={[
                            styles.radioItem,
                            { paddingHorizontal: 14, paddingVertical: 10 },
                            activo && styles.radioItemActivo,
                            activo && esPos && styles.radioItemUrgente,
                          ]}
                          onPress={() => setTestsDraft((prev) => ({ ...prev, [t.id]: res }))}
                        >
                          <Text
                            style={[
                              styles.radioLabel,
                              activo && styles.radioLabelActivo,
                              activo && esPos && { color: colors.urgente },
                            ]}
                          >
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

        {/* Sección Desparasitaciones */}
        <View style={styles.seccionCard}>
          <PlanDesparasitacionCard
            key={animal?.id ?? caso.id}
            fechaPrimera={fechaDesp1}
            fechaSegunda={fechaDesp2}
            onChangePrimera={setDesp1Fecha}
            onChangeSegunda={setDesp2Fecha}
            onValidityChange={setFechasValidas}
          />
        </View>

        {/* Datos individuales del animal (peso, gestación, estado vital y nombre en camada) */}
        {animalActual ? (
          <View style={styles.seccionCard}>
            <View style={styles.seccionHeader}>
              <MaterialIcons name="monitor-weight" size={20} color={colors.primary} />
              <Text style={styles.seccionTitulo}>Datos Clínicos Individuales</Text>
            </View>
            <Text style={styles.seccionDesc}>
              Registrá peso aproximado, gestación o fallecimiento de {animal ? animal.nombre : caso.nombreProvisorio}. Se guardan al presionar Guardar.
            </Text>

            {varios && (
              <View style={{ gap: 6 }}>
                <Text style={styles.toggleSub}>Nombre del animal en la camada</Text>
                <TextInput
                  style={[styles.textArea, { minHeight: 46, paddingVertical: 10 }]}
                  value={valorNombreAnimal}
                  onChangeText={setAnimalNombreDraft}
                  placeholder="Nombre del animal"
                  placeholderTextColor={colors.placeholderField}
                />
              </View>
            )}

            <View style={{ gap: 6 }}>
              <Text style={styles.toggleSub}>
                Peso aproximado en gramos{valorPesoGramos != null && valorPesoGramos > 0 ? ` (${(valorPesoGramos / 1000).toFixed(2).replace('.', ',')} kg)` : ''}
              </Text>
              <TextInput
                style={[styles.textArea, { minHeight: 46, paddingVertical: 10 }]}
                value={valorPesoTexto}
                onChangeText={setPesoDraft}
                keyboardType="numeric"
                placeholder="Ej: 3200 (equivale a 3,2 kg)"
                placeholderTextColor={colors.placeholderField}
              />
            </View>

            <Pressable
              style={styles.toggleRow}
              onPress={() => setEmbarazadaDraft(!valorEmbarazada)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: valorEmbarazada }}
            >
              <View style={[styles.checkbox, valorEmbarazada && styles.checkboxActivo]}>
                {valorEmbarazada && <MaterialIcons name="check" size={16} color={colors.onPrimary} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitulo}>Embarazada / Preñada</Text>
                <Text style={styles.toggleSub}>Afecta cirugía de castración y cuidados nutricionales.</Text>
              </View>
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={styles.toggleRow}
              onPress={() => setFallecidoDraft(!valorFallecido)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: valorFallecido }}
            >
              <View style={[styles.checkbox, valorFallecido && { backgroundColor: colors.urgente, borderColor: colors.urgente }]}>
                {valorFallecido && <MaterialIcons name="close" size={16} color={colors.onPrimary} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleTitulo, valorFallecido && { color: colors.urgenteText }]}>Fallecido</Text>
                <Text style={styles.toggleSub}>Marca individual de fallecimiento (si falleció todo el caso, actualizá también el estado general).</Text>
              </View>
            </Pressable>

            {valorFallecido && (
              <TextInput
                style={[styles.textArea, { minHeight: 60 }]}
                value={valorMotivoFallecimiento}
                onChangeText={setMotivoFallecimientoDraft}
                placeholder="Motivo o detalle del fallecimiento (opcional)..."
                placeholderTextColor={colors.placeholderField}
                multiline
              />
            )}
          </View>
        ) : null}

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
              <MaterialIcons name="check-circle" size={22} color={colors.onPrimary} />
              <Text style={styles.botonGuardarTexto}>Guardar Ficha y Recalcular Triaje</Text>
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
  bannerPrioridad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
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
  bannerEyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  bannerTitulo: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  bannerSub: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
  },
  triajeList: {
    gap: 8,
    marginTop: 4,
  },
  triajeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  triajeChipActivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  triajeTitulo: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  triajeTextoActivo: {
    color: colors.onPrimary,
  },
  triajeSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  triajeSubActivo: {
    color: 'rgba(255,255,255,0.85)',
  },
});
