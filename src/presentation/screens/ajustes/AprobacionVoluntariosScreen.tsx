import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SolicitudVoluntarioPendiente } from '../../../domain/repositories/AuthRepository';
import { authRepository } from '../../../di/container';
import { colors, fonts } from '../../theme';

type Props = {
  navigation?: any;
};

export function AprobacionVoluntariosScreen({ navigation }: Props) {
  const { top, bottom } = useSafeAreaInsets();
  const [solicitudes, setSolicitudes] = useState<SolicitudVoluntarioPendiente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargarSolicitudes = useCallback(async () => {
    try {
      if (authRepository.obtenerVoluntariosPendientes) {
        const datos = await authRepository.obtenerVoluntariosPendientes();
        setSolicitudes(datos);
      }
    } catch (e: any) {
      console.warn('Error al cargar solicitudes de voluntarios:', e);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    cargarSolicitudes();
  }, [cargarSolicitudes]);

  const onRefrescar = () => {
    setRefrescando(true);
    cargarSolicitudes();
  };

  const mostrarAviso = (texto: string) => {
    setAviso(texto);
    setTimeout(() => setAviso(null), 3500);
  };

  const handleAprobar = (vol: SolicitudVoluntarioPendiente) => {
    const confirmar = async () => {
      setProcesandoId(vol.id);
      try {
        if (!authRepository.aprobarVoluntario) throw new Error('Operación no soportada');
        const res = await authRepository.aprobarVoluntario(vol.id, vol.tokenAprobacion);
        if (res.success) {
          mostrarAviso(`✓ ${vol.nombre} fue aprobado con éxito`);
          setSolicitudes((prev) => prev.filter((s) => s.id !== vol.id));
        } else {
          Alert.alert('Error', res.mensaje);
        }
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'No se pudo aprobar el voluntario.');
      } finally {
        setProcesandoId(null);
      }
    };

    if (Platform.OS === 'web') {
      if (
        window.confirm(
          `¿Aprobar a ${vol.nombre}?\n\nEl voluntario quedará habilitado inmediatamente en la red de PERF Móvil para ver y registrar casos.`
        )
      ) {
        confirmar();
      }
    } else {
      Alert.alert(
        'Aprobar Voluntario',
        `¿Confirmás la aprobación de ${vol.nombre} (${vol.email})? Quedará habilitado para iniciar sesión inmediatamente.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Aprobar', style: 'default', onPress: confirmar },
        ]
      );
    }
  };

  const handleRechazar = (vol: SolicitudVoluntarioPendiente) => {
    const confirmar = async () => {
      setProcesandoId(vol.id);
      try {
        if (!authRepository.rechazarVoluntario) throw new Error('Operación no soportada');
        const res = await authRepository.rechazarVoluntario(vol.id, vol.tokenAprobacion);
        if (res.success) {
          mostrarAviso(`✕ Postulación de ${vol.nombre} rechazada y eliminada`);
          setSolicitudes((prev) => prev.filter((s) => s.id !== vol.id));
        } else {
          Alert.alert('Error', res.mensaje);
        }
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'No se pudo rechazar la solicitud.');
      } finally {
        setProcesandoId(null);
      }
    };

    const mensajeAdvertencia = `¿Rechazar y eliminar la postulación de ${vol.nombre}?\n\nEsta acción es irreversible: se borrarán permanentemente la cuenta, el perfil y todos los datos de la base de datos de PERF.`;

    if (Platform.OS === 'web') {
      if (window.confirm(mensajeAdvertencia)) {
        confirmar();
      }
    } else {
      Alert.alert('Rechazar y Eliminar Voluntario', mensajeAdvertencia, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar definitivamente', style: 'destructive', onPress: confirmar },
      ]);
    }
  };

  const abrirWhatsApp = (telefono: string, nombre: string) => {
    const digitos = telefono.replace(/\D/g, '');
    if (!digitos) return;
    const url = `https://wa.me/549${digitos}?text=Hola%20${encodeURIComponent(
      nombre
    )}%2C%20nos%20comunicamos%20desde%20la%20coordinaci%C3%B3n%20de%20PERF%20M%C3%B3vil`;
    Linking.openURL(url).catch(() => {});
  };

  const filtradas = solicitudes.filter((s) => {
    const query = busqueda.trim().toLowerCase();
    if (!query) return true;
    return (
      s.nombre.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query) ||
      (s.zona || '').toLowerCase().includes(query) ||
      (s.brigada || '').toLowerCase().includes(query)
    );
  });

  return (
    <View style={styles.screen}>
      {/* Header Superior */}
      <View style={[styles.header, { paddingTop: top + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable
            style={styles.btnVolver}
            onPress={() => navigation?.goBack?.()}
            accessibilityLabel="Volver a Ajustes"
          >
            <MaterialIcons name="arrow-back" size={20} color={colors.primary} />
            <Text style={styles.btnVolverText}>Ajustes</Text>
          </Pressable>
          <View style={styles.headerCentro}>
            <Text style={styles.headerTitulo}>Gestión de Voluntarios</Text>
            <Text style={styles.headerSub}>
              {solicitudes.length === 1
                ? '1 postulación pendiente'
                : `${solicitudes.length} postulaciones pendientes`}
            </Text>
          </View>
          <Pressable
            style={styles.btnRefresh}
            onPress={onRefrescar}
            disabled={refrescando}
            accessibilityLabel="Actualizar listado"
          >
            <MaterialIcons
              name="refresh"
              size={22}
              color={refrescando ? colors.textMuted : colors.primary}
            />
          </Pressable>
        </View>

        {/* Buscador rápido */}
        {solicitudes.length > 0 && (
          <View style={styles.buscadorBox}>
            <MaterialIcons name="search" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.buscadorInput}
              placeholder="Buscar por nombre, email o zona..."
              placeholderTextColor={colors.placeholderInput}
              value={busqueda}
              onChangeText={setBusqueda}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {busqueda.length > 0 && (
              <Pressable onPress={() => setBusqueda('')} hitSlop={8}>
                <MaterialIcons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* Contenido Principal */}
      {cargando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.cargandoText}>Consultando solicitudes pendientes...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + bottom }]}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={onRefrescar}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {filtradas.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconBox}>
                <MaterialIcons name="how-to-reg" size={48} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitulo}>
                {busqueda ? 'Sin coincidencias' : '¡Todo al día!'}
              </Text>
              <Text style={styles.emptyTexto}>
                {busqueda
                  ? `No se encontraron postulantes con "${busqueda}".`
                  : 'No hay solicitudes de voluntarios pendientes de aprobación en este momento.'}
              </Text>
              {busqueda.length > 0 && (
                <Pressable style={styles.btnLimpiarBusqueda} onPress={() => setBusqueda('')}>
                  <Text style={styles.btnLimpiarBusquedaText}>Limpiar búsqueda</Text>
                </Pressable>
              )}
            </View>
          ) : (
            filtradas.map((vol) => {
              const procesando = procesandoId === vol.id;
              const inicial = (vol.nombre || 'V').trim().charAt(0).toUpperCase();

              return (
                <View key={vol.id} style={styles.cardVoluntario}>
                  {/* Cabecera del postulante */}
                  <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{inicial}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.volNombre}>{vol.nombre}</Text>
                      <Text style={styles.volEmail}>{vol.email}</Text>
                    </View>
                    <View style={styles.badgePendiente}>
                      <Text style={styles.badgePendienteText}>PENDIENTE</Text>
                    </View>
                  </View>

                  {/* Detalle de datos */}
                  <View style={styles.cardBody}>
                    {/* Teléfono y WhatsApp */}
                    <View style={styles.filaDato}>
                      <MaterialIcons name="phone" size={16} color={colors.primary} />
                      <Text style={styles.datoTexto}>{vol.telefono || 'Sin teléfono'}</Text>
                      {vol.telefono ? (
                        <Pressable
                          style={styles.btnWhatsApp}
                          onPress={() => abrirWhatsApp(vol.telefono, vol.nombre)}
                        >
                          <MaterialIcons name="chat" size={13} color="#FFFFFF" />
                          <Text style={styles.btnWhatsAppText}>WhatsApp</Text>
                        </Pressable>
                      ) : null}
                    </View>

                    {/* Zona y Brigada */}
                    <View style={styles.filaDato}>
                      <MaterialIcons name="location-on" size={16} color={colors.primary} />
                      <Text style={styles.datoTexto}>
                        {vol.brigada || `Brigada ${vol.zona}`} ({vol.zona || 'CABA'})
                      </Text>
                    </View>

                    {/* Recursos de guardia */}
                    {vol.recursos && vol.recursos.length > 0 ? (
                      <View style={styles.recursosContainer}>
                        <Text style={styles.recursosLabel}>Recursos declarados:</Text>
                        <View style={styles.recursosRow}>
                          {vol.recursos.map((rec) => {
                            let label = rec;
                            let icon: keyof typeof MaterialIcons.glyphMap = 'check';
                            if (rec === 'canil') {
                              label = 'Canil propio';
                              icon = 'home';
                            } else if (rec === 'movil') {
                              label = 'Móvil / Auto';
                              icon = 'directions-car';
                            } else if (rec === 'transito') {
                              label = 'Tránsito disponible';
                              icon = 'hotel';
                            }
                            return (
                              <View key={rec} style={styles.chipRecurso}>
                                <MaterialIcons name={icon} size={14} color={colors.primary} />
                                <Text style={styles.chipRecursoText}>{label}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    ) : null}

                    {/* Fecha de solicitud */}
                    {vol.createdAt ? (
                      <View style={styles.filaFecha}>
                        <MaterialIcons name="schedule" size={14} color={colors.textMuted} />
                        <Text style={styles.fechaTexto}>
                          Postulado el{' '}
                          {new Date(vol.createdAt).toLocaleDateString('es-AR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Acciones del Coordinador */}
                  <View style={styles.cardActions}>
                    <Pressable
                      style={[styles.btnRechazar, procesando && { opacity: 0.5 }]}
                      onPress={() => handleRechazar(vol)}
                      disabled={procesando}
                      accessibilityLabel={`Rechazar y eliminar a ${vol.nombre}`}
                    >
                      <MaterialIcons name="person-remove" size={18} color={colors.urgente} />
                      <Text style={styles.btnRechazarText}>Rechazar</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.btnAprobar, procesando && { opacity: 0.5 }]}
                      onPress={() => handleAprobar(vol)}
                      disabled={procesando}
                      accessibilityLabel={`Aprobar a ${vol.nombre}`}
                    >
                      {procesando ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <MaterialIcons name="check" size={18} color="#FFFFFF" />
                          <Text style={styles.btnAprobarText}>Aprobar voluntario</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Toast flotante de confirmación */}
      {!!aviso && (
        <View style={[styles.toast, { bottom: 24 + bottom }]} pointerEvents="none">
          <MaterialIcons name="info" size={20} color="#FFFFFF" />
          <Text style={styles.toastText}>{aviso}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  btnVolver: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingRight: 8,
  },
  btnVolverText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.primary,
  },
  headerCentro: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitulo: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
  },
  headerSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  btnRefresh: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  buscadorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginTop: 8,
    gap: 8,
  },
  buscadorInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  cargandoText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 32,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitulo: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  emptyTexto: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  btnLimpiarBusqueda: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  btnLimpiarBusquedaText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primary,
  },
  cardVoluntario: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.primary,
  },
  volNombre: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  volEmail: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 1,
  },
  badgePendiente: {
    backgroundColor: colors.atencionBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgePendienteText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.atencion,
    letterSpacing: 0.5,
  },
  cardBody: {
    gap: 8,
    paddingVertical: 2,
  },
  filaDato: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datoTexto: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  btnWhatsApp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#25D366',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  btnWhatsAppText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  recursosContainer: {
    gap: 6,
    marginTop: 4,
  },
  recursosLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
  },
  recursosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chipRecurso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipRecursoText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.primary,
  },
  filaFecha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  fechaTexto: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  btnRechazar: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
  },
  btnRechazarText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.urgente,
  },
  btnAprobar: {
    flex: 1.5,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  btnAprobarText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#1F2937',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  toastText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
});
