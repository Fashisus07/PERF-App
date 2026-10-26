import { MaterialIcons } from '@expo/vector-icons';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvisoTurno, ETIQUETA_AVISO, ETIQUETA_MOTIVO, etiquetaDia, diaLargo, horaDe, mismoDia, sumarDias } from '../../../domain/models/Turno';
import { StackHeader } from '../../components/StackHeader';
import { UrgenciaBadge } from '../../components/UrgenciaBadge';
import { useTurnoCompleto } from '../../hooks/useTurnos';
import { colors, fonts } from '../../theme';
import { AvatarPerfil } from '../rescate/BarraRescate';

type Params = { turnoId: string; avisosProgramados: AvisoTurno[] };

const pad = (n: number) => String(n).padStart(2, '0');
// Formato que entiende Google Calendar: 20261020T103000
const marcaCalendario = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

export function TurnoAgendadoScreen({ route, navigation }: { route?: { params?: Params }; navigation?: any }) {
  const { bottom } = useSafeAreaInsets();
  const datos = useTurnoCompleto(route?.params?.turnoId ?? '');
  if (!datos) return <View style={styles.screen} />;

  const { turno, clinica, caso } = datos;
  const programados = route?.params?.avisosProgramados ?? [];
  const avisosActivos = programados.length > 0;
  const ahora = new Date();
  const fecha = new Date(turno.fechaHora);
  const manana = mismoDia(fecha, sumarDias(ahora, 1));
  const diaTexto = manana ? `Mañana, ${diaLargo(fecha)}` : etiquetaDia(fecha, ahora) === 'Hoy' ? `Hoy, ${diaLargo(fecha)}` : diaLargo(fecha);

  const irALista = () => navigation?.popTo?.('Main', { screen: 'Turnos' });
  const agregarACalendario = () => {
    const fin = new Date(fecha.getTime() + 45 * 60 * 1000);
    Linking.openURL(
      'https://calendar.google.com/calendar/render?action=TEMPLATE' +
        `&text=${encodeURIComponent(`Turno de ${caso.nombreProvisorio} — ${turno.motivo}`)}` +
        `&dates=${marcaCalendario(fecha)}/${marcaCalendario(fin)}` +
        `&location=${encodeURIComponent(`${clinica.nombre}, ${clinica.direccion}, ${clinica.barrio}`)}`,
    );
  };

  const fotoCaso = caso.fotoUri ? { uri: caso.fotoUri } : require('../../../../assets/images/casos/misho.jpg');

  return (
    <View style={styles.screen}>
      <StackHeader
        titulo="Confirmación De Turno"
        icono="close"
        onBack={irALista}
        tituloColor={colors.primary}
        derecha={<AvatarPerfil />}
      />
      <ScrollView contentContainerStyle={[styles.main, { paddingBottom: 32 + bottom }]}>
        <View style={styles.hero}>
          <View style={styles.circulo}>
            <MaterialIcons name="event-available" size={44} color={colors.primary} />
            <View style={styles.check}>
              <MaterialIcons name="check" size={14} color="#fff" />
            </View>
          </View>
          <Text style={styles.titulo}>¡Turno agendado con éxito!</Text>
          <Text style={styles.subtitulo}>Registrado en el calendario local y listo para sincronizar.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.casoRow}>
            <Image source={fotoCaso} style={styles.foto} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.nombreRow}>
                <Text style={styles.nombre}>{caso.nombreProvisorio}</Text>
                <UrgenciaBadge urgencia={caso.esUrgente ? 'urgente' : 'aldia'} />
              </View>
              <Text style={styles.casoSub}>
                {caso.especie} · {caso.edadEstimada}
              </Text>
            </View>
          </View>

          <View style={styles.fecha}>
            <View style={styles.fechaIcono}>
              <MaterialIcons name="event" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.fechaDia}>{diaTexto}</Text>
              <Text style={styles.fechaHora}>{horaDe(fecha)} hs</Text>
            </View>
          </View>

          <Fila icono="local-hospital">
            <Text style={styles.filaTitulo}>{clinica.nombre}</Text>
            {!!clinica.medico && <Text style={styles.filaSub}>{clinica.medico}</Text>}
          </Fila>
          <Fila icono="location-on">
            <Text style={styles.filaTexto}>{clinica.direccion}, {clinica.barrio}</Text>
            {!!clinica.distancia && <Text style={styles.filaLink}>{clinica.distancia}</Text>}
          </Fila>
          <Fila icono="medical-services">
            <Text style={styles.filaTitulo}>Motivo de consulta</Text>
            <Text style={styles.filaSub}>{turno.motivo}</Text>
          </Fila>

          <View style={styles.avisos}>
            <View style={styles.avisosTitulo}>
              <MaterialIcons name="notifications-active" size={16} color={colors.primary} />
              <Text style={styles.avisosText}>
                {turno.recordatorioMinutos === 1440 ? 'Aviso 24 horas antes' : 'Aviso 2 horas antes'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.recomendaciones}>
          <View style={styles.recoIcono}>
            <MaterialIcons name="info" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.recoTitulo}>Recomendaciones para el traslado</Text>
            <Text style={styles.recoTexto}>
              Recordá llevar a {caso.nombreProvisorio} en canil cerrado con manta térmica y libreta sanitaria provisoria.
            </Text>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <Pressable style={styles.primario} onPress={irALista}>
            <MaterialIcons name="event" size={20} color="#fff" />
            <Text style={styles.primarioText}>Ver en la lista de turnos</Text>
          </Pressable>
          <Pressable style={styles.secundario} onPress={agregarACalendario}>
            <MaterialIcons name="sync" size={18} color={colors.primary} />
            <Text style={styles.secundarioText}>Añadir a Google Calendar / Alarma</Text>
          </Pressable>
          <Pressable style={styles.terciario} onPress={() => navigation?.popTo?.('DetalleCaso', { casoId: caso.id })}>
            <MaterialIcons name="arrow-back" size={16} color={colors.primary} />
            <Text style={styles.terciarioText}>Volver a la ficha de {caso.nombreProvisorio}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Fila({ icono, children }: { icono: keyof typeof MaterialIcons.glyphMap; children: React.ReactNode }) {
  return (
    <View style={styles.fila}>
      <MaterialIcons name={icono} size={20} color={colors.text} />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  main: { padding: 16, gap: 16 },
  hero: { alignItems: 'center', gap: 8, paddingTop: 4 },
  circulo: { width: 88, height: 88, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', marginBottom: 6, backgroundColor: '#9cf2e8' },
  check: { position: 'absolute', right: -2, bottom: 2, width: 26, height: 26, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.aldia },
  titulo: { fontFamily: fonts.bold, fontSize: 24, color: colors.text, textAlign: 'center' },
  subtitulo: { maxWidth: 300, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: 'center' },

  card: { gap: 14, padding: 16, borderRadius: 16, backgroundColor: colors.surface },
  casoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  foto: { width: 56, height: 56, borderRadius: 12 },
  nombreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nombre: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  casoSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  fecha: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, backgroundColor: colors.surfaceCard },
  fechaIcono: { width: 40, height: 40, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#9cf2e8' },
  fechaDia: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  fechaHora: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  filaTitulo: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  filaTexto: { fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  filaSub: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  filaLink: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  avisos: { gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.surfaceCard },
  avisosTitulo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avisosText: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  avisosChips: { flexDirection: 'row', gap: 8 },
  avisoChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, backgroundColor: colors.surfaceChip },
  avisoChipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  avisosAyuda: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textMuted },

  recomendaciones: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.atencionBg },
  recoIcono: { width: 36, height: 36, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bannerWarnIcon },
  recoTitulo: { fontFamily: fonts.bold, fontSize: 15, color: colors.atencionText },
  recoTexto: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.bannerWarnText },

  primario: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 9999, backgroundColor: colors.primary },
  primarioText: { fontFamily: fonts.semibold, fontSize: 16, color: '#fff' },
  secundario: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 9999, backgroundColor: colors.surfaceChip },
  secundarioText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
  terciario: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  terciarioText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
});
