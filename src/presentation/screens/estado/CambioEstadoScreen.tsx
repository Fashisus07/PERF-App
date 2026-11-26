import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  EstadoCaso,
  ETIQUETA_ESTADO,
  ETIQUETA_GRAVEDAD,
  ETIQUETA_VULNERABILIDAD,
  GravedadClinica,
  Vulnerabilidad,
} from '../../../domain/models/Caso';
import { calcularPrioridadCasoUseCase } from '../../../domain/usecases/CalcularPrioridadCasoUseCase';
import { estadoRequiereDestino } from '../../../domain/usecases/CambiarEstadoCaso';
import { StackHeader } from '../../components/StackHeader';
import { fotoCasoSource } from '../../components/fotoCaso';
import { obtenerAjustes } from '../../hooks/useAjustes';
import { useCambiarEstado } from '../../hooks/useCambiarEstado';
import { useCaso } from '../../hooks/useCaso';
import { useOnline } from '../../hooks/useOnline';
import { colors, fonts } from '../../theme';
import { ESTADOS_CASO, infoEstado } from './estadosCaso';

const GRAVEDADES_OPTS: GravedadClinica[] = ['CRITICA', 'MODERADA', 'LEVE', 'SANA'];
const VULN_OPTS: Vulnerabilidad[] = ['LACTANTE_SIN_MADRE', 'SIN_TRANSITO', 'EN_TRATAMIENTO', 'ESTABLE'];

const PLACEHOLDER_DESTINO: Partial<Record<EstadoCaso, string>> = {
  EN_TRANSITO: 'Ej: Casa de Lucía (Caballito)',
  EN_CLINICA: 'Ej: Clínica Veterinaria Patitas',
  PRE_ADOPTADO: 'Ej: Familia evaluada (opcional)',
  EN_ADOPCION: 'Ej: Redes PERF / Difusión',
  ADOPTADO: 'Ej: Domicilio del adoptante (opcional)',
  FALLECIDO: 'Ej: Clínica que constató (opcional)',
};

type Props = {
  route?: { params?: { casoId: string } };
  navigation?: any;
};

export function CambioEstadoScreen({ route, navigation }: Props) {
  const { bottom } = useSafeAreaInsets();
  const online = useOnline();
  const cambiarEstado = useCambiarEstado();
  const { caso } = useCaso(route?.params?.casoId ?? '');
  const [elegido, setElegido] = useState<EstadoCaso | null>(null);
  const [destino, setDestino] = useState('');
  const [motivo, setMotivo] = useState('');
  const [notificar, setNotificar] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [umbralDias, setUmbralDias] = useState(15);
  const [gravedadElegida, setGravedadElegida] = useState<GravedadClinica | null>(null);
  const [vulnerabilidadElegida, setVulnerabilidadElegida] = useState<Vulnerabilidad | null>(null);

  useEffect(() => {
    obtenerAjustes()
      .then((a) => setUmbralDias(a.umbralUrgenteDias))
      .catch(() => {});
  }, []);

  if (!caso) {
    return (
      <View style={styles.screen}>
        <StackHeader titulo="Cambiar Estado" onBack={() => navigation?.goBack?.()} />
      </View>
    );
  }

  const actual = caso.estadoCaso ?? 'EN_TRANSITO';
  const esCierre = elegido === 'ADOPTADO' || elegido === 'FALLECIDO';
  const gravedadActiva = gravedadElegida ?? caso.gravedadClinica;
  const vulnActiva = vulnerabilidadElegida ?? caso.vulnerabilidad;

  const seleccionarEstado = (nuevoEstado: EstadoCaso) => {
    setElegido(nuevoEstado);
    if (nuevoEstado === 'EN_CLINICA') {
      setVulnerabilidadElegida('EN_TRATAMIENTO');
      if (caso.gravedadClinica === 'SANA') setGravedadElegida('MODERADA');
      else setGravedadElegida(caso.gravedadClinica);
    } else if (nuevoEstado === 'EN_ADOPCION' || nuevoEstado === 'PRE_ADOPTADO') {
      if (caso.vulnerabilidad === 'SIN_TRANSITO' || caso.vulnerabilidad === 'EN_TRATAMIENTO') {
        setVulnerabilidadElegida('ESTABLE');
      } else {
        setVulnerabilidadElegida(caso.vulnerabilidad);
      }
      if (nuevoEstado === 'EN_ADOPCION' && caso.gravedadClinica === 'CRITICA') {
        setGravedadElegida('LEVE');
      } else {
        setGravedadElegida(caso.gravedadClinica);
      }
    } else if (nuevoEstado === 'EN_TRANSITO') {
      if (caso.vulnerabilidad === 'SIN_TRANSITO') {
        setVulnerabilidadElegida('ESTABLE');
      } else {
        setVulnerabilidadElegida(caso.vulnerabilidad);
      }
      setGravedadElegida(caso.gravedadClinica);
    } else {
      setGravedadElegida(caso.gravedadClinica);
      setVulnerabilidadElegida(caso.vulnerabilidad);
    }
  };

  const prioridadResultante = elegido
    ? calcularPrioridadCasoUseCase.ejecutar(
        {
          estadoCaso: elegido,
          gravedadClinica: gravedadActiva,
          vulnerabilidad: vulnActiva,
          fechaRescate: caso.fechaRescate,
          fechaUltimaRevision: caso.fechaUltimaRevision,
          sanidad: caso.sanidad,
        },
        umbralDias
      )
    : null;

  const requiereDestino = !!elegido && estadoRequiereDestino(elegido);
  const completo = !!elegido && !!motivo.trim() && (!requiereDestino || !!destino.trim());

  const confirmar = async () => {
    if (!elegido || !completo || guardando) return;
    setGuardando(true);
    setErrorGuardado(null);
    const fecha = new Date();
    try {
      await cambiarEstado.ejecutar(caso.id, {
        estado: elegido,
        motivo: motivo.trim(),
        destino: destino.trim() || undefined,
        gravedadClinica: !esCierre ? gravedadActiva : undefined,
        vulnerabilidad: !esCierre ? vulnActiva : undefined,
        sinConexion: !online,
      });
      navigation?.navigate?.('ConfirmacionCambio', {
        casoId: caso.id,
        anterior: actual,
        nuevo: elegido,
        destino: destino.trim() || undefined,
        hora: `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`,
        sinConexion: !online,
      });
    } catch (e: any) {
      setErrorGuardado(e?.message || 'No se pudo actualizar el estado. Intentá nuevamente.');
      setGuardando(false);
    }
  };

  const fotoSource = fotoCasoSource(caso);
  const ubicacionActual = caso.transito.nombre ? `Tránsito: ${caso.transito.nombre}` : `Barrio: ${caso.barrio}`;

  return (
    <View style={styles.screen}>
      <StackHeader titulo="Cambiar Estado" onBack={() => navigation?.goBack?.()} />
      <ScrollView
        contentContainerStyle={[styles.main, { paddingBottom: 150 + bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.resumen}>
          <View style={styles.resumenTop}>
            <View>
              <Image source={fotoSource} style={styles.foto} />
            </View>
            <View style={styles.resumenInfo}>
              <View style={styles.nombreRow}>
                <Text style={styles.nombre}>{caso.nombreProvisorio}</Text>
                <View style={styles.idBadge}>
                  <Text style={styles.idText}>#{caso.id.slice(0, 8)}</Text>
                </View>
              </View>
              <Text style={styles.descripcion}>{caso.especie} · {caso.edadEstimada}</Text>
              <View style={styles.diasRow}>
                <MaterialIcons name="schedule" size={14} color={colors.textMuted} />
                <Text style={styles.dias}>{caso.quienSigueCaso ? `Coordina: ${caso.quienSigueCaso}` : 'PERF'}</Text>
              </View>
            </View>
          </View>
          <View style={styles.actualBox}>
            <View style={styles.actualInfo}>
              <View style={styles.actualIcon}>
                <MaterialIcons name={infoEstado(actual).iconoChip} size={16} color={colors.atencion} />
              </View>
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.actualLabel}>
                  Estado actual: <Text style={{ color: colors.atencion }}>{ETIQUETA_ESTADO[actual]}</Text>
                </Text>
                <Text style={styles.actualSub} numberOfLines={1}>{ubicacionActual}</Text>
              </View>
            </View>
            <View style={styles.vigente}>
              <Text style={styles.vigenteText}>Vigente</Text>
            </View>
          </View>
        </View>

        {errorGuardado ? (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={20} color={colors.urgente} />
            <Text style={styles.errorBannerText}>{errorGuardado}</Text>
          </View>
        ) : null}

        <View style={styles.tituloRow}>
          <Text style={styles.titulo}>Seleccionar nuevo estado</Text>
          <Text style={styles.link}>Toca para elegir</Text>
        </View>

        <View style={styles.lista}>
          {ESTADOS_CASO.map((e) => {
            const esActual = e.key === actual;
            const activo = e.key === elegido;
            return (
              <Pressable
                key={e.key}
                disabled={esActual}
                onPress={() => seleccionarEstado(e.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: activo, disabled: esActual }}
                style={[styles.opcion, esActual && styles.opcionActual, activo && styles.opcionActiva]}
              >
                <View style={[styles.opcionIcon, esActual && { backgroundColor: colors.border }]}>
                  <MaterialIcons
                    name={e.icono}
                    size={22}
                    color={e.key === 'EN_CLINICA' ? colors.urgente : esActual ? colors.textSubtle : colors.primary}
                  />
                </View>
                <View style={styles.opcionTexto}>
                  <View style={styles.opcionTop}>
                    <Text style={styles.opcionTitulo}>{e.titulo}</Text>
                    {esActual ? (
                      <View style={styles.actualBadge}>
                        <MaterialIcons name="check" size={12} color={colors.atencionText} />
                        <Text style={styles.actualBadgeText}>Actual</Text>
                      </View>
                    ) : (
                      <View style={[styles.radio, activo && styles.radioActivo]}>
                        {activo && <MaterialIcons name="check" size={14} color={colors.onPrimary} />}
                      </View>
                    )}
                  </View>
                  {e.aviso && !esActual && (
                    <View style={[styles.aviso, { backgroundColor: e.aviso.bg }]}>
                      <Text style={[styles.avisoText, { color: e.aviso.fg }]}>{e.aviso.texto}</Text>
                    </View>
                  )}
                  <Text style={styles.opcionDesc}>{e.descripcion}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {elegido && (
          <View style={styles.triajeCard}>
            <View style={styles.triajeTop}>
              <MaterialIcons name="health-and-safety" size={20} color={colors.primary} />
              <Text style={styles.triajeCardTitle}>Impacto en Triaje Multicriterio</Text>
            </View>

            {prioridadResultante && (
              <View
                style={[
                  styles.previewBox,
                  prioridadResultante.nivelPrioridad === 'URGENTE'
                    ? styles.previewUrgente
                    : prioridadResultante.nivelPrioridad === 'ATENCION'
                    ? styles.previewAtencion
                    : styles.previewAldia,
                ]}
              >
                <Text style={styles.previewMotivo}>{prioridadResultante.motivoUrgencia}</Text>
                <Text style={styles.previewPts}>{prioridadResultante.puntajePrioridad} pts</Text>
              </View>
            )}

            {!esCierre ? (
              <>
                <View style={{ gap: 6 }}>
                  <Text style={styles.label}>Gravedad clínica resultante</Text>
                  <View style={styles.miniChips}>
                    {GRAVEDADES_OPTS.map((g) => {
                      const sel = gravedadActiva === g;
                      return (
                        <Pressable
                          key={g}
                          style={[styles.miniChip, sel && styles.miniChipActivo]}
                          onPress={() => setGravedadElegida(g)}
                        >
                          <Text style={[styles.miniChipText, sel && styles.miniChipTextActivo]}>
                            {ETIQUETA_GRAVEDAD[g]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={styles.label}>Vulnerabilidad resultante</Text>
                  <View style={styles.miniChips}>
                    {VULN_OPTS.map((v) => {
                      const sel = vulnActiva === v;
                      return (
                        <Pressable
                          key={v}
                          style={[styles.miniChip, sel && styles.miniChipActivo]}
                          onPress={() => setVulnerabilidadElegida(v)}
                        >
                          <Text style={[styles.miniChipText, sel && styles.miniChipTextActivo]}>
                            {ETIQUETA_VULNERABILIDAD[v]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.cierreNota}>
                Al cerrar el caso como {ETIQUETA_ESTADO[elegido]}, saldrá de la lista activa y su prioridad pasará a 0 pts.
              </Text>
            )}
          </View>
        )}

        <View style={styles.form}>
          <View style={{ gap: 8 }}>
            <Text style={styles.label}>
              Seleccionar clínica / nuevo destino{requiereDestino ? '' : elegido ? ' (opcional)' : ''}
            </Text>
            <View>
              <TextInput
                style={[styles.input, !elegido && { opacity: 0.7 }]}
                editable={!!elegido}
                value={destino}
                onChangeText={setDestino}
                placeholder={elegido ? PLACEHOLDER_DESTINO[elegido] : 'Selecciona primero un nuevo estado arriba...'}
                placeholderTextColor={colors.placeholderInput}
              />
              <View style={styles.inputIcon} pointerEvents="none">
                <MaterialIcons name="location-on" size={18} color={colors.textSubtle} />
              </View>
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <View style={styles.motivoLabelRow}>
              <Text style={styles.label}>Motivo o notas de campo</Text>
              <Text style={styles.requerido}>Requerido</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textarea]}
              multiline
              value={motivo}
              onChangeText={setMotivo}
              placeholder="Ej: Se completa postoperatorio y pasa a adaptación en domicilio verificado..."
              placeholderTextColor={colors.placeholderInput}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.notificarRow}>
            <View style={styles.notificarInfo}>
              <View style={styles.notificarIcon}>
                <MaterialIcons name="chat" size={18} color={colors.textMuted} />
              </View>
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.label}>Notificar al coordinador de zona</Text>
                <Text style={styles.notificarSub}>Envía plantilla rápida por WhatsApp</Text>
              </View>
            </View>
            <Switch
              value={notificar}
              onValueChange={setNotificar}
              trackColor={{ false: colors.surfaceChip, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.offline}>
            <MaterialIcons name="cloud-done" size={18} color={colors.textMuted} />
            <Text style={styles.offlineText}>La actualización se guarda localmente en el teléfono si no hay señal.</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 16 + bottom }]}>
        <Pressable
          style={[styles.cta, !completo && styles.ctaDeshabilitado]}
          disabled={!completo || guardando}
          onPress={confirmar}
          accessibilityState={{ disabled: !completo }}
        >
          {guardando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="check-circle-outline" size={18} color="#fff" />
              <Text style={styles.ctaText}>{elegido ? 'Confirmar cambio de estado' : 'Selecciona un nuevo estado'}</Text>
            </>
          )}
        </Pressable>
        <Pressable style={styles.cancelar} onPress={() => navigation?.goBack?.()}>
          <Text style={styles.cancelarText}>Cancelar y volver a la ficha de {caso.nombreProvisorio}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const sombra = { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 1, shadowOffset: { width: 0, height: 1 }, elevation: 1 };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  main: { padding: 16, gap: 16 },

  resumen: { gap: 16, padding: 16, borderRadius: 12, backgroundColor: colors.surface, ...sombra },
  resumenTop: { flexDirection: 'row', gap: 16 },
  foto: { width: 64, height: 64, borderRadius: 12 },
  sexoBadge: { position: 'absolute', right: -4, bottom: -4, width: 24, height: 24, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.atencionBg },
  resumenInfo: { flex: 1, gap: 4 },
  nombreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nombre: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text },
  idBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, backgroundColor: colors.surfaceMuted },
  idText: { fontFamily: fonts.bold, fontSize: 14, color: colors.textMuted },
  descripcion: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  diasRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 2 },
  dias: { fontFamily: fonts.bold, fontSize: 14, color: colors.textMuted },
  actualBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 8, borderRadius: 8, backgroundColor: colors.surfaceCard },
  actualInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  actualIcon: { width: 32, height: 32, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.atencionBg },
  actualLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  actualSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  vigente: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.border },
  vigenteText: { fontFamily: fonts.bold, fontSize: 14, color: colors.textMuted },

  tituloRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -8 },
  titulo: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text },
  link: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },

  lista: { gap: 8 },
  opcion: { flexDirection: 'row', gap: 16, padding: 16, borderRadius: 12, borderWidth: 2, borderColor: 'transparent', backgroundColor: colors.surface, ...sombra },
  opcionActual: { backgroundColor: colors.surfaceCard, opacity: 0.8 },
  opcionActiva: { borderColor: colors.primary },
  opcionIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  opcionTexto: { flex: 1, gap: 4 },
  opcionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  opcionTitulo: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  opcionDesc: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  radio: { width: 20, height: 20, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  radioActivo: { backgroundColor: colors.primary },
  actualBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 9999, backgroundColor: colors.atencionBg },
  actualBadgeText: { fontFamily: fonts.bold, fontSize: 14, color: colors.atencionText },
  aviso: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  avisoText: { fontFamily: fonts.bold, fontSize: 14 },

  form: { gap: 16, padding: 16, borderRadius: 12, backgroundColor: colors.surface, ...sombra },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  input: { minHeight: 56, paddingLeft: 40, paddingRight: 16, borderRadius: 8, backgroundColor: colors.surfaceCard, fontFamily: fonts.regular, fontSize: 16, color: colors.text },
  inputIcon: { position: 'absolute', left: 12, top: 0, bottom: 0, justifyContent: 'center' },
  motivoLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  requerido: { fontFamily: fonts.bold, fontSize: 14, color: colors.placeholderInput },
  textarea: { minHeight: 110, paddingLeft: 14, paddingTop: 14, paddingBottom: 14 },
  notificarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 4 },
  notificarInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  notificarIcon: { width: 40, height: 40, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  notificarSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, backgroundColor: colors.surfaceCard },
  offlineText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },

  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 4, paddingHorizontal: 16, paddingTop: 16, backgroundColor: 'rgba(252,249,244,0.97)', elevation: 12 },
  cta: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 9999, backgroundColor: colors.primary },
  ctaDeshabilitado: { opacity: 0.4 },
  ctaText: { fontFamily: fonts.semibold, fontSize: 15, color: '#fff' },
  cancelar: { height: 40, alignItems: 'center', justifyContent: 'center' },
  cancelarText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
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
  triajeCard: {
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    ...sombra,
  },
  triajeTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  triajeCardTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  previewUrgente: { backgroundColor: colors.urgenteBg, borderColor: colors.urgente },
  previewAtencion: { backgroundColor: colors.atencionBg, borderColor: colors.atencion },
  previewAldia: { backgroundColor: colors.aldiaBg, borderColor: colors.aldia },
  previewMotivo: { fontFamily: fonts.bold, fontSize: 13, color: colors.text, flex: 1 },
  previewPts: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
  miniChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  miniChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 38,
    justifyContent: 'center',
  },
  miniChipActivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  miniChipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted },
  miniChipTextActivo: { color: colors.onPrimary },
  cierreNota: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, lineHeight: 18 },
});
