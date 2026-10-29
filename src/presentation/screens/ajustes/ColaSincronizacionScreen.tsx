import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { casoRepository } from '../../../di/container';
import { OperacionPendiente } from '../../../domain/repositories/CasoRepository';
import { StackHeader } from '../../components/StackHeader';
import { useOnline } from '../../hooks/useOnline';
import { colors, fonts } from '../../theme';

type Props = {
  navigation?: any;
};

const ICONO_ENTIDAD: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  CASO: 'pets',
  HISTORIAL: 'history-edu',
  TURNO: 'event',
};

export function ColaSincronizacionScreen({ navigation }: Props) {
  const { bottom } = useSafeAreaInsets();
  const online = useOnline();
  const [operaciones, setOperaciones] = useState<OperacionPendiente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [mensajeToast, setMensajeToast] = useState<string | null>(null);

  const cargarCola = async () => {
    try {
      const lista = await casoRepository.obtenerOperacionesPendientes();
      setOperaciones(lista);
    } catch {
      // Manejo silencioso
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCola();
  }, []);

  useEffect(() => {
    if (!mensajeToast) return;
    const t = setTimeout(() => setMensajeToast(null), 2500);
    return () => clearTimeout(t);
  }, [mensajeToast]);

  const handleSincronizar = async () => {
    if (!online) {
      setMensajeToast('Sin conexión a internet. Los datos se enviarán cuando vuelva la señal.');
      return;
    }
    setSincronizando(true);
    try {
      const enviadas = await casoRepository.sincronizar();
      await cargarCola();
      setMensajeToast(
        enviadas === 0
          ? 'No había cambios pendientes.'
          : `¡${enviadas} ${enviadas === 1 ? 'cambio sincronizado' : 'cambios sincronizados'} con éxito!`
      );
    } catch (e: any) {
      setMensajeToast(e?.message || 'Error al sincronizar.');
    } finally {
      setSincronizando(false);
    }
  };

  const formatearFecha = (ts: number) => {
    const f = new Date(ts);
    return `${f.toLocaleDateString('es-AR')} ${f.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs`;
  };

  const formatearPayload = (payloadStr: string) => {
    try {
      const obj = JSON.parse(payloadStr);
      if (obj.estadoCaso) {
        return `Estado: ${obj.estadoCaso} ${obj.motivo ? `· ${obj.motivo}` : ''}`;
      }
      if (obj.descripcion) {
        return `Nota: ${obj.descripcion}`;
      }
      if (obj.nombreProvisorio) {
        return `Rescate: ${obj.nombreProvisorio} (${obj.barrio})`;
      }
      return Object.keys(obj).slice(0, 3).map((k) => `${k}: ${obj[k]}`).join(' · ');
    } catch {
      return payloadStr;
    }
  };

  return (
    <View style={styles.screen}>
      <StackHeader titulo="Cola de Sincronización" onBack={() => navigation?.goBack?.()} />

      {cargando ? (
        <View style={styles.centro}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Tarjeta de Estado de Conectividad (MD3 Surface Container) */}
          <View style={[styles.conexionCard, !online && styles.conexionCardOffline]}>
            <View style={[styles.conexionIcono, !online && styles.conexionIconoOffline]}>
              <MaterialIcons
                name={online ? 'cloud-done' : 'cloud-off'}
                size={24}
                color={online ? colors.primary : colors.atencion}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.conexionTitulo}>
                {online ? 'Conexión Activa a Internet' : 'Modo Offline Activado'}
              </Text>
              <Text style={styles.conexionDesc}>
                {online
                  ? 'La app tiene acceso al servidor y sincroniza en segundo plano.'
                  : 'Las operaciones se registran localmente en SQLite y se enviarán al recuperar la red.'}
              </Text>
            </View>
          </View>

          {/* Resumen Métrico */}
          <View style={styles.metricasRow}>
            <View style={styles.metricaCard}>
              <Text style={styles.metricaNumero}>{operaciones.length}</Text>
              <Text style={styles.metricaLabel}>Operaciones en cola</Text>
            </View>
            <View style={styles.metricaCard}>
              <Text style={[styles.metricaNumero, { color: operaciones.length === 0 ? colors.aldia : colors.atencion }]}>
                {operaciones.length === 0 ? 'Al día' : 'Pendiente'}
              </Text>
              <Text style={styles.metricaLabel}>Estado de datos</Text>
            </View>
          </View>

          {/* Listado de Operaciones o Estado Vacío */}
          {operaciones.length === 0 ? (
            <View style={styles.vacioCard}>
              <View style={styles.vacioIcono}>
                <MaterialIcons name="done-all" size={36} color={colors.aldia} />
              </View>
              <Text style={styles.vacioTitulo}>Todo está sincronizado</Text>
              <Text style={styles.vacioDesc}>
                No tenés operaciones pendientes de envío en este dispositivo. Toda la información de rescates, turnos e historias clínicas está asegurada.
              </Text>
            </View>
          ) : (
            <View style={styles.listaSection}>
              <Text style={styles.seccionTitulo}>Operaciones pendientes en SQLite</Text>
              {operaciones.map((op) => (
                <View key={op.id} style={styles.opCard}>
                  <View style={styles.opHeader}>
                    <View style={styles.opIcono}>
                      <MaterialIcons
                        name={ICONO_ENTIDAD[op.entidad] || 'sync'}
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.opBadgeRow}>
                        <Text style={styles.opEntidad}>{op.entidad}</Text>
                        <View style={styles.opTipoBadge}>
                          <Text style={styles.opTipoText}>{op.operacion}</Text>
                        </View>
                      </View>
                      <Text style={styles.opFecha}>{formatearFecha(op.created_at)}</Text>
                    </View>
                  </View>

                  <View style={styles.payloadBox}>
                    <Text style={styles.payloadText}>{formatearPayload(op.payload)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Botón de Sincronización Forzada */}
          <Pressable
            style={[
              styles.btnSincronizar,
              (sincronizando || operaciones.length === 0) && styles.btnDeshabilitado,
            ]}
            onPress={handleSincronizar}
            disabled={sincronizando || operaciones.length === 0}
          >
            {sincronizando ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <>
                <MaterialIcons name="sync" size={20} color={colors.onPrimary} />
                <Text style={styles.btnSincronizarText}>
                  {operaciones.length === 0 ? 'Sin datos para enviar' : 'Forzar Sincronización Ahora'}
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      )}

      {/* Toast Feedback */}
      {!!mensajeToast && (
        <View style={[styles.toast, { bottom: bottom + 24 }]} pointerEvents="none">
          <MaterialIcons name="info" size={18} color={colors.toastIcon} />
          <Text style={styles.toastText}>{mensajeToast}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 16 },

  conexionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  conexionCardOffline: {
    backgroundColor: colors.bannerWarn,
    borderColor: '#fed7aa',
  },
  conexionIcono: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conexionIconoOffline: {
    backgroundColor: colors.atencionBg,
  },
  conexionTitulo: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  conexionDesc: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 16 },

  metricasRow: { flexDirection: 'row', gap: 12 },
  metricaCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 4,
  },
  metricaNumero: { fontFamily: fonts.bold, fontSize: 24, color: colors.primary },
  metricaLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSubtle },

  vacioCard: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  vacioIcono: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.aldiaBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vacioTitulo: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  vacioDesc: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },

  listaSection: { gap: 10, marginTop: 8 },
  seccionTitulo: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  opCard: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  opHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  opIcono: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  opEntidad: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  opTipoBadge: {
    backgroundColor: colors.surfaceChip,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  opTipoText: { fontFamily: fonts.bold, fontSize: 10, color: colors.primary },
  opFecha: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSubtle, marginTop: 2 },

  payloadBox: {
    backgroundColor: colors.surfaceCard,
    padding: 10,
    borderRadius: 8,
  },
  payloadText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },

  btnSincronizar: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    elevation: 2,
  },
  btnDeshabilitado: { opacity: 0.6 },
  btnSincronizarText: { fontFamily: fonts.bold, fontSize: 15, color: colors.onPrimary },

  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.toastBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 6,
    maxWidth: '90%',
  },
  toastText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.toastText },
});
