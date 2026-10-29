import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { turnoRepository } from '../../../di/container';
import { Caso } from '../../../domain/models/Caso';
import { Clinica, horaDe, mismoDia, nombreDia, Turno } from '../../../domain/models/Turno';
import { AppHeader } from '../../components/AppHeader';
import { cancelarTurno, useTurnos } from '../../hooks/useTurnos';
import { useOnline } from '../../hooks/useOnline';
import { colors, fonts } from '../../theme';

const abrirMapa = (c: Clinica) =>
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.nombre} ${c.direccion} ${c.barrio}`)}`);
const llamar = (c: Clinica) => Linking.openURL(`tel:${c.telefono}`);

export function TurnosScreen({ navigation }: { navigation?: any }) {
  const online = useOnline();
  const { turnos, clinicas, casosPorId, cargando, recargar } = useTurnos();
  const [cancelando, setCancelando] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  useEffect(() => {
    if (!feedbackToast) return;
    const timer = setTimeout(() => setFeedbackToast(null), 2500);
    return () => clearTimeout(timer);
  }, [feedbackToast]);

  const ahora = new Date();
  const deHoy = turnos.filter((t) => mismoDia(new Date(t.fechaHora), ahora));
  const proximos = turnos.filter((t) => !mismoDia(new Date(t.fechaHora), ahora));
  const clinica = (t: Turno) => clinicas.find((c) => c.id === (t.centroVeterinarioId || (t as any).clinicaId)) || clinicas[0];

  const toggleCumplido = async (t: Turno) => {
    try {
      await turnoRepository.marcarCumplido(t.id);
      setFeedbackToast(t.cumplido ? 'Turno marcado como pendiente' : '¡Turno marcado como cumplido!');
      recargar();
    } catch {
      setFeedbackToast('Error al actualizar el turno');
    }
  };

  const menu = (t: Turno) => {
    const caso = casosPorId[t.casoId];
    Alert.alert('Opciones del Turno', `${caso?.nombreProvisorio || 'Animal'} · ${t.motivo}`, [
      {
        text: 'Ver ficha del animal',
        onPress: () => navigation?.navigate?.('DetalleCaso', { casoId: t.casoId }),
      },
      {
        text: t.cumplido ? 'Marcar como pendiente' : 'Marcar como cumplido',
        onPress: () => toggleCumplido(t),
      },
      {
        text: 'Cancelar turno',
        style: 'destructive',
        onPress: async () => {
          setCancelando(true);
          try {
            await cancelarTurno.ejecutar(t.id);
            setFeedbackToast('Turno cancelado exitosamente');
            recargar();
          } catch {
            setFeedbackToast('Error al cancelar el turno');
          } finally {
            setCancelando(false);
          }
        },
      },
      { text: 'Volver', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.screen}>
      <AppHeader subtitle="TURNOS" />
      {cargando ? (
        <View style={styles.centro}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.main}>
            <View style={styles.tituloRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.titulo}>Agenda de turnos veterinarios</Text>
                <Text style={styles.sub}>
                  {turnos.length} {turnos.length === 1 ? 'cita programada' : 'citas programadas'}
                </Text>
              </View>
              <View style={[styles.conexion, !online && styles.conexionOff]}>
                <MaterialIcons name={online ? 'cloud-done' : 'cloud-off'} size={16} color={colors.textMuted} />
                <View>
                  <Text style={styles.conexionText}>{online ? 'Online' : 'Offline'}</Text>
                  <Text style={styles.conexionSub}>{online ? 'sincronizado' : 'activo'}</Text>
                </View>
              </View>
            </View>

            <Pressable
              style={styles.directorioBanner}
              onPress={() => navigation?.navigate?.('DirectorioClinicas')}
              accessibilityLabel="Directorio veterinario y guardias 24 hs"
            >
              <View style={styles.directorioIcono}>
                <MaterialIcons name="local-hospital" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.directorioTitulo}>Directorio Veterinario y Guardias</Text>
                <Text style={styles.directorioTexto}>
                  Centros amigos, guardias 24 hs, cirugías y llamadas directas
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.textSubtle} />
            </Pressable>

            {deHoy.length > 0 && (
              <View style={styles.traslados}>
                <View style={styles.trasladosIcono}>
                  <MaterialIcons name="medical-services" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trasladosTitulo}>
                    {deHoy.length} {deHoy.length === 1 ? 'traslado previsto' : 'traslados previstos'} hoy
                  </Text>
                  <Text style={styles.trasladosTexto}>Coordinar caniles limpios y ayunos</Text>
                </View>
              </View>
            )}

            {turnos.length === 0 && (
              <View style={styles.vacio}>
                <MaterialIcons name="event-available" size={40} color={colors.textSubtle} />
                <Text style={styles.vacioTitulo}>No hay turnos programados</Text>
                <Text style={styles.vacioTexto}>Agendá el primero desde el botón de abajo.</Text>
              </View>
            )}

            {deHoy.length > 0 && (
              <>
                <View style={styles.seccion}>
                  <View style={styles.seccionTitulo}>
                    <View style={[styles.punto, { backgroundColor: colors.primary }]} />
                    <Text style={styles.seccionText}>Hoy</Text>
                  </View>
                  <Text style={styles.seccionSub}>
                    {deHoy.length} {deHoy.length === 1 ? 'consulta' : 'consultas'}
                  </Text>
                </View>
                {deHoy.map((t) => (
                  <TarjetaTurno key={t.id} turno={t} caso={casosPorId[t.casoId]} clinica={clinica(t)} hoy navigation={navigation} onMenu={menu} />
                ))}
              </>
            )}

            {proximos.length > 0 && (
              <>
                <View style={styles.seccion}>
                  <View style={styles.seccionTitulo}>
                    <View style={[styles.punto, { backgroundColor: colors.textMuted }]} />
                    <Text style={styles.seccionText}>Próximos días</Text>
                  </View>
                  <Text style={styles.seccionSub}>Esta semana</Text>
                </View>
                {proximos.map((t) => (
                  <TarjetaTurno key={t.id} turno={t} caso={casosPorId[t.casoId]} clinica={clinica(t)} navigation={navigation} onMenu={menu} />
                ))}
              </>
            )}
          </ScrollView>

          <View style={styles.pie}>
            <Pressable style={styles.agendar} onPress={() => navigation?.navigate?.('AgendarTurno')} disabled={cancelando}>
              <MaterialIcons name="add-circle" size={22} color="#fff" />
              <Text style={styles.agendarText}>Agendar turno</Text>
            </Pressable>
          </View>

          {feedbackToast ? (
            <View style={styles.toast} pointerEvents="none">
              <MaterialIcons name="check-circle" size={20} color={colors.toastIcon} />
              <Text style={styles.toastText}>{feedbackToast}</Text>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

type TarjetaProps = { turno: Turno; caso?: Caso; clinica: Clinica; hoy?: boolean; navigation?: any; onMenu: (t: Turno) => void };

function TarjetaTurno({ turno: t, caso, clinica, hoy, navigation, onMenu }: TarjetaProps) {
  if (!caso) return null;
  const lugar = [clinica.barrio, clinica.direccion].filter(Boolean).join(' · ');
  const fecha = new Date(t.fechaHora);
  const fotoCaso = caso.fotoUri ? { uri: caso.fotoUri } : require('../../../../assets/images/casos/misho.jpg');

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Pressable
          style={styles.cardHeaderPressable}
          onPress={() => navigation?.navigate?.('DetalleCaso', { casoId: caso.id })}
        >
          <Image source={fotoCaso} style={styles.foto} />
          <View style={{ flex: 1, gap: 3 }}>
            <View style={styles.nombreRow}>
              <Text style={styles.nombre}>{caso.nombreProvisorio}</Text>
              <View style={styles.chip}>
                <Text style={styles.chipText}>{caso.especie} · {caso.edadEstimada}</Text>
              </View>
            </View>
            <View style={styles.cuando}>
              <MaterialIcons name={hoy ? 'schedule' : 'event'} size={15} color={colors.atencion} />
              <Text style={styles.cuandoText}>
                {hoy ? `${horaDe(fecha)} hs` : `${nombreDia(fecha)} · ${horaDe(fecha)} hs`}
              </Text>
            </View>
          </View>
        </Pressable>
        <Pressable style={styles.menuTopBtn} onPress={() => onMenu(t)} accessibilityLabel="Opciones">
          <MaterialIcons name="more-vert" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.detalle}>
        <View style={styles.detalleFila}>
          <MaterialIcons name="medical-services" size={18} color={colors.textMuted} />
          <Text style={styles.detalleTitulo}>{t.motivo}</Text>
        </View>
        <View style={styles.detalleFila}>
          <MaterialIcons name={clinica.tipo === 'consultorio' ? 'storefront' : 'local-hospital'} size={18} color={colors.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={styles.detalleTexto}>{clinica.nombre}</Text>
            <Text style={styles.detalleSub}>{clinica.detalle ?? lugar}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardActionsRow}>
        <Pressable
          style={[styles.estadoPill, t.cumplido ? styles.estadoOk : styles.estadoPend]}
          onPress={() => onMenu(t)}
        >
          <MaterialIcons name={t.cumplido ? 'check-circle' : 'schedule'} size={14} color={t.cumplido ? colors.aldiaText : colors.atencion} />
          <Text style={[styles.estadoText, { color: t.cumplido ? colors.aldiaText : colors.atencion }]}>
            {t.cumplido ? 'Cumplido' : 'Pendiente'}
          </Text>
        </Pressable>

        <Pressable style={styles.historiaLink} onPress={() => navigation?.navigate?.('DetalleCaso', { casoId: caso.id })}>
          <MaterialIcons name="pets" size={16} color={colors.primary} />
          <Text style={styles.historiaLinkText}>Ficha</Text>
        </Pressable>

        <Pressable style={styles.callBtn} onPress={() => llamar(clinica)}>
          <MaterialIcons name="call" size={16} color="#fff" />
          <Text style={styles.callBtnText}>Llamar</Text>
        </Pressable>

        <Pressable style={styles.mapBtn} onPress={() => abrirMapa(clinica)}>
          <MaterialIcons name="directions" size={16} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  main: { padding: 16, paddingBottom: 110, gap: 14 },
  tituloRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  titulo: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, color: colors.text },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  conexion: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.surfaceChip },
  conexionOff: { backgroundColor: colors.offlineBanner },
  conexionText: { fontFamily: fonts.bold, fontSize: 13, color: colors.textMuted, lineHeight: 15 },
  conexionSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, lineHeight: 14 },
  traslados: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.bannerInfo },
  trasladosIcono: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#cfe4e2' },
  trasladosTitulo: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  trasladosTexto: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  vacio: { alignItems: 'center', gap: 6, paddingVertical: 48 },
  vacioTitulo: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  vacioTexto: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },

  seccion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  seccionTitulo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  punto: { width: 10, height: 10, borderRadius: 9999 },
  seccionText: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  seccionSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },

  card: { gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.surface },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  foto: { width: 52, height: 52, borderRadius: 9999 },
  nombreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nombre: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.surfaceChip },
  chipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted },
  cuando: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cuandoText: { fontFamily: fonts.bold, fontSize: 15, color: colors.atencion },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  estadoOk: { backgroundColor: colors.aldiaBg },
  estadoPend: { backgroundColor: colors.atencionBg },
  estadoText: { fontFamily: fonts.bold, fontSize: 13 },

  ayuno: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, backgroundColor: colors.bannerWarn },
  ayunoTitulo: { fontFamily: fonts.bold, fontSize: 14, color: colors.bannerWarnTitle },
  ayunoTexto: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.bannerWarnText },
  detalle: { gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.surfaceCard },
  detalleFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detalleTitulo: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  detalleTexto: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  detalleSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },

  botones: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12 },
  btnPrimario: { backgroundColor: colors.primary },
  btnPrimarioText: { fontFamily: fonts.semibold, fontSize: 14, color: '#fff' },
  btnSecundario: { backgroundColor: colors.surfaceChip },
  btnSecundarioText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
  pieCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historia: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  historiaText: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  menu: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },

  pie: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, backgroundColor: 'rgba(252,249,244,0.96)' },
  agendar: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 9999, backgroundColor: colors.primary },
  agendarText: { fontFamily: fonts.semibold, fontSize: 16, color: '#fff' },

  cardHeaderPressable: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuTopBtn: { width: 36, height: 36, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceChip },
  cardActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  estadoPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999 },
  historiaLink: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999, backgroundColor: colors.surfaceChip },
  historiaLinkText: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
  callBtn: { flex: 1, height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 9999, backgroundColor: colors.primary },
  callBtnText: { fontFamily: fonts.bold, fontSize: 13, color: '#fff' },
  mapBtn: { width: 36, height: 36, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceChip },

  toast: {
    position: 'absolute',
    bottom: 84,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.toastBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    elevation: 6,
  },
  toastText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.toastText },
  directorioBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceCard,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  directorioIcono: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directorioTitulo: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  directorioTexto: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
});
