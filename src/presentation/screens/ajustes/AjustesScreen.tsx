import { MaterialIcons } from '@expo/vector-icons';
import { ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UMBRAL_MAX, UMBRAL_MIN, Voluntario } from '../../../domain/models/Ajustes';
import { authRepository } from '../../../di/container';
import { useAjustes, sincronizarAhora } from '../../hooks/useAjustes';
import { useOnline } from '../../hooks/useOnline';
import { colors, fonts } from '../../theme';
import { AvatarPerfil } from '../rescate/BarraRescate';

const VERSION: string = require('../../../../app.json').expo.version;

type Props = { navigation?: any };

export function AjustesScreen({ navigation }: Props) {
  const { top, bottom } = useSafeAreaInsets();
  const online = useOnline();
  const { borrador, cambiar, hayCambios, guardarCambios, resumen, actualizarResumen, cargando } = useAjustes();
  const [sincronizando, setSincronizando] = useState(false);
  const [mensajeSync, setMensajeSync] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [voluntario, setVoluntario] = useState<Voluntario | null>(null);

  useEffect(() => {
    authRepository.obtenerVoluntarioActual().then(setVoluntario);
    const unsubscribe = navigation?.addListener?.('focus', () => {
      authRepository.obtenerVoluntarioActual().then(setVoluntario);
      actualizarResumen();
    });
    return unsubscribe;
  }, [navigation]);

  // El aviso ("Cambios guardados") desaparece solo.
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 2200);
    return () => clearTimeout(t);
  }, [aviso]);

  const guardar = async () => {
    try {
      await guardarCambios();
      setAviso('Cambios guardados');
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudieron guardar los cambios');
    }
  };

  const sincronizar = async () => {
    setSincronizando(true);
    setMensajeSync(null);
    const r = await sincronizarAhora.ejecutar(online);
    await actualizarResumen();
    setMensajeSync(
      'sinConexion' in r
        ? 'Sin conexión: los cambios se enviarán al recuperar la señal.'
        : r.enviados === 0
          ? 'Todo está sincronizado.'
          : `${r.enviados} ${r.enviados === 1 ? 'caso enviado' : 'casos enviados'} a la red de PERF.`,
    );
    setSincronizando(false);
  };

  const cerrarSesion = async () => {
    await authRepository.cerrarSesion();
    navigation?.reset?.({ index: 0, routes: [{ name: 'Login' }] });
  };
  const porcentaje = resumen ? Math.min(100, (resumen.megabytes / resumen.capacidadMegabytes) * 100) : 0;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: top }]}>
        <View style={styles.headerRow}>
          <Pressable style={styles.volver} onPress={() => navigation?.goBack?.()} accessibilityLabel="Volver">
            <MaterialIcons name="arrow-back" size={20} color={colors.primary} />
            <Text style={styles.volverText}>Volver</Text>
          </Pressable>
          <Text style={styles.titulo}>Ajustes</Text>
          <AvatarPerfil />
        </View>
      </View>

      {cargando ? (
        <View style={styles.centro}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={[styles.main, { paddingBottom: 170 + bottom }]}>
            <View style={styles.intro}>
              <View style={styles.introTitulo}>
                <MaterialIcons name="tune" size={16} color={colors.primary} />
                <Text style={styles.introLabel}>CONFIGURACIÓN DE CAMPO</Text>
              </View>
              <Text style={styles.introTexto}>
                Personaliza umbrales de triaje, sincronización sin conexión y avisos de traslados veterinarios.
              </Text>
            </View>

            <Tarjeta icono="adjust" fondo={colors.urgenteBg} color={colors.urgente} titulo="Criterios de Urgencia y Triaje" sub="Umbral automático para catálogo de rescates">
              <View style={styles.umbral}>
                <Text style={styles.umbralLabel}>Días de espera para marcar como urgente</Text>
                <View style={styles.stepper}>
                  <Pressable
                    style={[styles.stepBtn, borrador.umbralUrgenteDias <= UMBRAL_MIN && { opacity: 0.4 }]}
                    onPress={() => cambiar({ umbralUrgenteDias: Math.max(UMBRAL_MIN, borrador.umbralUrgenteDias - 1) })}
                    accessibilityLabel="Restar un día"
                  >
                    <MaterialIcons name="remove" size={26} color={colors.text} />
                  </Pressable>
                  <View style={styles.valor}>
                    <Text style={styles.valorNumero}>{borrador.umbralUrgenteDias}</Text>
                    <Text style={styles.valorUnidad}>{borrador.umbralUrgenteDias === 1 ? 'DÍA' : 'DÍAS'}</Text>
                  </View>
                  <Pressable
                    style={[styles.stepBtn, borrador.umbralUrgenteDias >= UMBRAL_MAX && { opacity: 0.4 }]}
                    onPress={() => cambiar({ umbralUrgenteDias: Math.min(UMBRAL_MAX, borrador.umbralUrgenteDias + 1) })}
                    accessibilityLabel="Sumar un día"
                  >
                    <MaterialIcons name="add" size={26} color={colors.text} />
                  </Pressable>
                </View>
                <View style={styles.umbralAyuda}>
                  <MaterialIcons name="error" size={16} color={colors.urgente} />
                  <Text style={styles.umbralAyudaText}>
                    Los casos que superen este número de días aparecerán como urgentes con insignia roja en la lista prioritaria.
                  </Text>
                </View>
              </View>
            </Tarjeta>

            <Tarjeta icono="sync" fondo="#cfe4e2" color={colors.primary} titulo="Almacenamiento y Sincronización" sub="Operatividad en zonas sin cobertura">
              <FilaToggle
                titulo="Modo offline automático"
                texto="Guardar siempre en el celular para trabajar sin señal"
                valor={borrador.modoOfflineAutomatico}
                onChange={(v) => cambiar({ modoOfflineAutomatico: v })}
              />
              {resumen && (
                <View style={styles.memoria}>
                  <View style={styles.memoriaTop}>
                    <Text style={styles.memoriaLabel}>Espacio en memoria local</Text>
                    <Text style={styles.memoriaValor}>{resumen.megabytes.toFixed(1).replace('.', ',')} MB</Text>
                  </View>
                  <View style={styles.barra}>
                    <View style={[styles.barraLlena, { width: `${porcentaje}%` }]} />
                  </View>
                  <View style={styles.memoriaPie}>
                    <View style={styles.memoriaItem}>
                      <MaterialIcons name="folder-open" size={15} color={colors.textMuted} />
                      <Text style={styles.memoriaItemText}>{resumen.casosActivos} casos activos</Text>
                    </View>
                    <View style={styles.memoriaItem}>
                      <MaterialIcons name="archive" size={15} color={colors.textMuted} />
                      <Text style={styles.memoriaItemText}>{resumen.archivados} archivados</Text>
                    </View>
                  </View>
                </View>
              )}
              <View style={styles.syncActionsRow}>
                <Pressable style={styles.sincronizar} onPress={sincronizar} disabled={sincronizando}>
                  {sincronizando ? <ActivityIndicator color={colors.primary} /> : <MaterialIcons name="sync" size={18} color={colors.primary} />}
                  <Text style={styles.sincronizarText}>Forzar sincronización</Text>
                </Pressable>
                <Pressable
                  style={styles.btnVerCola}
                  onPress={() => navigation?.navigate?.('ColaSincronizacion')}
                >
                  <MaterialIcons name="queue" size={18} color={colors.primary} />
                  <Text style={styles.btnVerColaText}>Ver cola offline</Text>
                </Pressable>
              </View>
              {!!mensajeSync && <Text style={styles.mensajeSync}>{mensajeSync}</Text>}
            </Tarjeta>

            <Tarjeta icono="notifications-active" fondo={colors.atencionBg} color={colors.atencion} titulo="Notificaciones de Turnos" sub="Alertas de traslados a veterinarias asociadas">
              <FilaToggle
                icono="event"
                titulo="Recordatorio anticipado"
                texto="1 día antes del turno asignado"
                valor={borrador.recordatorioUnDia}
                onChange={(v) => cambiar({ recordatorioUnDia: v })}
              />
              <View style={styles.separador} />
              <FilaToggle
                icono="schedule"
                titulo="Alerta de salida"
                texto="2 horas antes (para alistar transportadora)"
                valor={borrador.alertaDosHoras}
                onChange={(v) => cambiar({ alertaDosHoras: v })}
              />
              <View style={styles.info}>
                <MaterialIcons name="info" size={16} color={colors.textMuted} />
                <Text style={styles.infoText}>Las notificaciones se envían al dispositivo si tenés la app activa o en segundo plano.</Text>
              </View>
            </Tarjeta>

            <View style={styles.acerca}>
              <View style={styles.acercaTop}>
                <View style={styles.logo}>
                  <Image source={require('../../../../assets/images/logo.png')} style={styles.logoImg} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.acercaNombre}>PERF Móvil</Text>
                  <Text style={styles.acercaVersion}>Versión {VERSION}</Text>
                  <Text style={styles.acercaSub}>Para voluntarios de rescate animal</Text>
                </View>
              </View>
              <View style={styles.linea} />
              <Pressable
                style={styles.sesion}
                onPress={() => navigation?.navigate?.('PerfilVoluntario')}
                accessibilityLabel="Editar perfil del voluntario"
              >
                <MaterialIcons name="badge" size={22} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sesionLabel}>Sesión activa como</Text>
                  <Text style={styles.sesionNombre}>
                    {voluntario?.nombre || 'Mariana Gomez'} · {voluntario?.brigada || 'Brigada Caballito'}
                  </Text>
                  <Text style={styles.sesionEditar}>Toca para editar tus datos o equipamiento</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={colors.textSubtle} />
              </Pressable>
              <Pressable style={styles.cerrar} onPress={cerrarSesion}>
                <MaterialIcons name="logout" size={18} color={colors.urgente} />
                <Text style={styles.cerrarText}>Cerrar sesión o cambiar voluntario</Text>
              </Pressable>
            </View>
          </ScrollView>

          <View style={[styles.pie, { paddingBottom: 14 + bottom }]}>
            <View style={styles.pieInfo}>
              <MaterialIcons name="info" size={14} color={colors.textMuted} />
              <Text style={styles.pieInfoText}>Guarda los cambios en umbrales de urgencia y preferencias de notificación.</Text>
            </View>
            <Pressable style={[styles.guardar, !hayCambios && { opacity: 0.5 }]} onPress={guardar} disabled={!hayCambios}>
              <MaterialIcons name="save" size={20} color="#fff" />
              <Text style={styles.guardarText}>Guardar cambios</Text>
            </Pressable>
          </View>

          {!!aviso && (
            <View style={[styles.toast, { bottom: 150 + bottom }]} pointerEvents="none">
              <MaterialIcons name="check-circle" size={20} color={colors.toastIcon} />
              <Text style={styles.toastText}>{aviso}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

type TarjetaProps = { icono: keyof typeof MaterialIcons.glyphMap; fondo: string; color: string; titulo: string; sub: string; children: ReactNode };

function Tarjeta({ icono, fondo, color, titulo, sub, children }: TarjetaProps) {
  return (
    <View style={styles.tarjeta}>
      <View style={styles.tarjetaTop}>
        <View style={[styles.tarjetaIcono, { backgroundColor: fondo }]}>
          <MaterialIcons name={icono} size={26} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tarjetaTitulo}>{titulo}</Text>
          <Text style={styles.tarjetaSub}>{sub}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

type FilaProps = { icono?: keyof typeof MaterialIcons.glyphMap; titulo: string; texto: string; valor: boolean; onChange: (v: boolean) => void };

function FilaToggle({ icono, titulo, texto, valor, onChange }: FilaProps) {
  return (
    <View style={styles.fila}>
      {icono && <MaterialIcons name={icono} size={22} color={colors.primary} />}
      <View style={{ flex: 1 }}>
        <Text style={styles.filaTitulo}>{titulo}</Text>
        <Text style={styles.filaTexto}>{texto}</Text>
      </View>
      <Toggle valor={valor} onChange={onChange} etiqueta={titulo} />
    </View>
  );
}

// Interruptor con tilde en la perilla, como en el diseño.
function Toggle({ valor, onChange, etiqueta }: { valor: boolean; onChange: (v: boolean) => void; etiqueta: string }) {
  return (
    <Pressable
      onPress={() => onChange(!valor)}
      accessibilityRole="switch"
      accessibilityLabel={etiqueta}
      accessibilityState={{ checked: valor }}
      style={[styles.toggle, valor ? styles.toggleOn : styles.toggleOff]}
    >
      <View style={[styles.perilla, valor ? { right: 3 } : { left: 3 }]}>
        {valor && <MaterialIcons name="check" size={16} color={colors.primary} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: colors.surfaceHeader, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerRow: { height: 64, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 44 },
  volverText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.primary },
  titulo: { flex: 1, fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  main: { padding: 16, gap: 16 },
  intro: { gap: 6 },
  introTitulo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  introLabel: { fontFamily: fonts.bold, fontSize: 14, letterSpacing: 0.4, color: colors.primary },
  introTexto: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textMuted },

  tarjeta: { gap: 14, padding: 16, borderRadius: 16, backgroundColor: colors.surface },
  tarjetaTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  tarjetaIcono: { width: 52, height: 52, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  tarjetaTitulo: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  tarjetaSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },

  umbral: { alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, backgroundColor: colors.surfaceCard },
  umbralLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 28 },
  stepBtn: { width: 56, height: 56, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceChip },
  valor: { alignItems: 'center', minWidth: 70 },
  valorNumero: { fontFamily: fonts.bold, fontSize: 40, lineHeight: 44, color: colors.primary },
  valorUnidad: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.6, color: colors.textMuted },
  umbralAyuda: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  umbralAyudaText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textMuted },

  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  filaTitulo: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  filaTexto: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: colors.textMuted },
  separador: { height: 1, backgroundColor: colors.border },
  toggle: { width: 56, height: 32, borderRadius: 9999, justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.primary },
  toggleOff: { backgroundColor: colors.surfaceChip },
  perilla: { position: 'absolute', width: 26, height: 26, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },

  memoria: { gap: 8, padding: 14, borderRadius: 14, backgroundColor: colors.surfaceCard },
  memoriaTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memoriaLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  memoriaValor: { fontFamily: fonts.bold, fontSize: 15, color: colors.primary },
  barra: { height: 8, borderRadius: 9999, backgroundColor: colors.surfaceChip, overflow: 'hidden' },
  barraLlena: { height: 8, borderRadius: 9999, backgroundColor: colors.primary },
  memoriaPie: { flexDirection: 'row', justifyContent: 'space-between' },
  memoriaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memoriaItemText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  sincronizar: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, backgroundColor: colors.surfaceChip },
  sincronizarText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  syncActionsRow: { flexDirection: 'row', gap: 8 },
  btnVerCola: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, backgroundColor: colors.primarySoft },
  btnVerColaText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  mensajeSync: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted, textAlign: 'center' },

  info: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.surfaceCard },
  infoText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textMuted },

  acerca: { gap: 14, padding: 16, borderRadius: 16, backgroundColor: colors.surface },
  acercaTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logo: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  logoImg: { width: 40, height: 40 },
  acercaNombre: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  acercaVersion: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
  acercaSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  linea: { height: 1, backgroundColor: colors.border },
  sesion: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, backgroundColor: colors.surfaceCard },
  sesionLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  sesionNombre: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  sesionEditar: { fontFamily: fonts.regular, fontSize: 11, color: colors.primary, marginTop: 2 },
  cerrar: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, backgroundColor: colors.urgenteBg },
  cerrarText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.urgente },

  pie: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 8, paddingHorizontal: 16, paddingTop: 10, backgroundColor: 'rgba(252,249,244,0.97)' },
  pieInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pieInfoText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  guardar: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 9999, backgroundColor: colors.primary },
  guardarText: { fontFamily: fonts.semibold, fontSize: 16, color: '#fff' },
  toast: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 9999, backgroundColor: colors.toast },
  toastText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.toastText },
});
