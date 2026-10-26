import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Urgencia } from '../../../domain/models/Caso';
import { formatoFecha } from '../../../domain/models/Rescate';
import {
  AvisoTurno,
  Clinica,
  conHora,
  ETIQUETA_AVISO,
  ETIQUETA_MOTIVO,
  HORARIOS_FORMULARIO,
  MotivoConsulta,
  mismoDia,
  sumarDias,
  etiquetaDia,
  diaLargo,
  SolicitudTurno,
} from '../../../domain/models/Turno';
import { CupoNoDisponible } from '../../../domain/usecases/AgendarTurno';
import { StackHeader } from '../../components/StackHeader';
import { useCasos } from '../../hooks/useCasos';
import { obtenerAjustes } from '../../hooks/useAjustes';
import { agendarTurno, obtenerClinicas } from '../../hooks/useTurnos';
import { colors, fonts } from '../../theme';
import { AvatarPerfil } from '../rescate/BarraRescate';

const MOTIVOS = Object.keys(ETIQUETA_MOTIVO) as MotivoConsulta[];
const PRIORIDAD: Record<Urgencia, string> = {
  urgente: 'Prioridad de control',
  atencion: 'Control programado',
  aldia: 'Control de rutina',
};

type Props = { route?: { params?: { casoId?: string } }; navigation?: any };

export function AgendarTurnoScreen({ route, navigation }: Props) {
  const { bottom } = useSafeAreaInsets();
  const { casos } = useCasos();
  const [casoId, setCasoId] = useState<string | undefined>(route?.params?.casoId);
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [clinicaId, setClinicaId] = useState('patitas');
  const [eligiendoClinica, setEligiendoClinica] = useState(false);
  const [dia, setDia] = useState(1); // 0 = hoy, 1 = mañana, 2 = pasado mañana
  const [hora, setHora] = useState<string | null>('10:30');
  const [motivo, setMotivo] = useState<MotivoConsulta>('control');
  const [notas, setNotas] = useState('');
  const [avisos, setAvisos] = useState<AvisoTurno[]>(['1dia', '2horas']);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    obtenerClinicas().then(setClinicas);
    // Los recordatorios que vienen marcados salen de los Ajustes.
    obtenerAjustes().then((a) =>
      setAvisos([...(a.recordatorioUnDia ? (['1dia'] as AvisoTurno[]) : []), ...(a.alertaDosHoras ? (['2horas'] as AvisoTurno[]) : [])]),
    );
  }, []);

  const ahora = new Date();
  const dias = [0, 1, 2].map((n) => sumarDias(ahora, n));
  const fechaDia = dias[dia];
  const caso = casos.find((c) => c.id === casoId);
  const clinica = clinicas.find((c) => c.id === clinicaId);

  // Hoy no se pueden elegir horarios que ya pasaron.
  const horaPasada = (h: string) => mismoDia(fechaDia, ahora) && conHora(fechaDia, h).getTime() <= ahora.getTime();
  const cambiarDia = (n: number) => {
    setDia(n);
    if (hora && mismoDia(dias[n], ahora) && conHora(dias[n], hora).getTime() <= ahora.getTime()) setHora(null);
  };

  const completo = !!caso && !!hora && !!clinica;
  // Chips: "Hoy", "Mañana" y el día de la semana siguiente con su número (ej: "Miércoles 21").
  const etiquetasDia = dias.map((d, i) => (i < 2 ? etiquetaDia(d, ahora) : `${diaLargo(d).split(' de ')[0]}`));
  const etiquetaFecha = (() => {
    const e = etiquetaDia(fechaDia, ahora);
    return e === 'Hoy' || e === 'Mañana' ? `${e} (${formatoFecha(fechaDia)})` : e;
  })();

  const alternarAviso = (a: AvisoTurno) =>
    setAvisos((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const confirmar = async () => {
    if (!caso || !hora || !clinica || guardando) return;
    setGuardando(true);
    const fechaTurno = conHora(fechaDia, hora);
    const solicitud: SolicitudTurno = {
      casoId: caso.id,
      centroVeterinarioId: clinicaId,
      fechaHora: fechaTurno.getTime(),
      motivo,
      recordatorioMinutos: avisos.includes('1dia') ? 1440 : 120,
    };
    try {
      const r = await agendarTurno.ejecutar(solicitud, caso);
      navigation?.replace?.('TurnoAgendado', { turnoId: r.turno.id, avisosProgramados: avisos });
    } catch (e) {
      if (e instanceof CupoNoDisponible) {
        navigation?.replace?.('TurnoNoDisponible', {
          solicitud: { ...solicitud, clinicaId, fecha: fechaTurno.toISOString(), avisos },
          opciones: e.opciones.map((o) => ({ fecha: o.fecha.toISOString(), espera: o.espera })),
        });
      }
      setGuardando(false);
    }
  };

  const fotoCaso = caso?.fotoUri ? { uri: caso.fotoUri } : require('../../../../assets/images/casos/misho.jpg');

  return (
    <View style={styles.screen}>
      <StackHeader titulo="Agendar Turno" onBack={() => navigation?.goBack?.()} derecha={<AvatarPerfil />} />
      <ScrollView contentContainerStyle={[styles.main, { paddingBottom: 120 + bottom }]} keyboardShouldPersistTaps="handled">
        {caso ? (
          <View style={styles.card}>
            <View style={styles.casoRow}>
              <Image source={fotoCaso} style={styles.foto} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.casoNombre}>
                  {caso.nombreProvisorio} <Text style={styles.casoDesc}>({caso.especie} · {caso.edadEstimada})</Text>
                </Text>
                {!!caso.historiaOrigen && <Text style={styles.casoResumen}>{caso.historiaOrigen.split('.')[0]}</Text>}
                <View style={styles.prioridad}>
                  <MaterialIcons name="schedule" size={14} color={colors.textMuted} />
                  <Text style={styles.prioridadText}>{caso.esUrgente ? 'Caso urgente' : 'Atención regular'}</Text>
                </View>
              </View>
              {!route?.params?.casoId && (
                <Pressable onPress={() => setCasoId(undefined)} hitSlop={8}>
                  <Text style={styles.link}>Cambiar</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.seccion}>¿Para qué caso es el turno?</Text>
            {casos.length === 0 && <ActivityIndicator color={colors.primary} />}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {casos.map((c) => (
                <Pressable key={c.id} style={styles.casoOpcion} onPress={() => setCasoId(c.id)} accessibilityRole="button">
                  <Image
                    source={c.fotoUri ? { uri: c.fotoUri } : require('../../../../assets/images/casos/misho.jpg')}
                    style={styles.casoOpcionFoto}
                  />
                  <Text style={styles.casoOpcionNombre}>{c.nombreProvisorio}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.bloque}>
          <View style={styles.seccionRow}>
            <MaterialIcons name="event" size={16} color={colors.primary} />
            <Text style={styles.seccion}>Fecha del turno</Text>
          </View>
          <View style={styles.fechaCampo}>
            <MaterialIcons name="event" size={20} color={colors.primary} />
            <Text style={styles.fechaText}>
              {etiquetaFecha}
            </Text>
          </View>
          <View style={styles.chips}>
            {etiquetasDia.map((e, i) => (
              <Pressable key={e} style={[styles.chip, dia === i && styles.chipActivo]} onPress={() => cambiarDia(i)}>
                <Text style={[styles.chipText, dia === i && { color: '#fff' }]}>{e}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.bloque}>
          <View style={styles.seccionRow}>
            <MaterialIcons name="schedule" size={16} color={colors.primary} />
            <Text style={styles.seccion}>Hora de atención</Text>
          </View>
          <View style={styles.horas}>
            {HORARIOS_FORMULARIO.map((h) => {
              const activa = hora === h;
              const pasada = horaPasada(h);
              return (
                <Pressable
                  key={h}
                  disabled={pasada}
                  onPress={() => setHora(h)}
                  accessibilityState={{ selected: activa, disabled: pasada }}
                  style={[styles.hora, activa && styles.horaActiva, pasada && { opacity: 0.4 }]}
                >
                  <MaterialIcons name={activa ? 'check-circle' : 'schedule'} size={16} color={activa ? '#fff' : colors.textMuted} />
                  <Text style={[styles.horaText, activa && { color: '#fff' }]}>{h} hs</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.bloque}>
          <View style={styles.seccionRow}>
            <MaterialIcons name="local-hospital" size={16} color={colors.primary} />
            <Text style={[styles.seccion, { flex: 1 }]}>Centro veterinario</Text>
            <Pressable onPress={() => setEligiendoClinica((v) => !v)} hitSlop={8}>
              <Text style={styles.link}>{eligiendoClinica ? 'Listo' : 'Cambiar veterinaria'}</Text>
            </Pressable>
          </View>
          {clinica && <TarjetaClinica clinica={clinica} />}
          {eligiendoClinica &&
            clinicas
              .filter((c) => c.id !== clinicaId)
              .map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    setClinicaId(c.id);
                    setEligiendoClinica(false);
                  }}
                >
                  <TarjetaClinica clinica={c} />
                </Pressable>
              ))}
        </View>

        <View style={styles.bloque}>
          <View style={styles.seccionRow}>
            <MaterialIcons name="description" size={16} color={colors.primary} />
            <Text style={styles.seccion}>Motivo de consulta</Text>
          </View>
          <View style={styles.chips}>
            {MOTIVOS.map((m) => {
              const activo = motivo === m;
              return (
                <Pressable key={m} style={[styles.chip, activo && styles.chipActivo]} onPress={() => setMotivo(m)}>
                  {activo && <MaterialIcons name="check" size={16} color="#fff" />}
                  <Text style={[styles.chipText, activo && { color: '#fff' }]}>{ETIQUETA_MOTIVO[m]}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            style={styles.notas}
            value={notas}
            onChangeText={setNotas}
            multiline
            textAlignVertical="top"
            placeholder="Notas breves para el veterinario (ej: ya terminó medicación antibiótica, persiste leve estornudo)..."
            placeholderTextColor={colors.placeholderInput}
          />
        </View>

        <View style={styles.bloque}>
          <View style={styles.seccionRow}>
            <MaterialIcons name="notifications-active" size={16} color={colors.primary} />
            <Text style={styles.seccion}>Recordatorio en el teléfono</Text>
          </View>
          <View style={styles.horas}>
            {(Object.keys(ETIQUETA_AVISO) as AvisoTurno[]).map((a) => {
              const activo = avisos.includes(a);
              return (
                <Pressable
                  key={a}
                  style={[styles.aviso, activo && styles.horaActiva]}
                  onPress={() => alternarAviso(a)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: activo }}
                >
                  <MaterialIcons name={activo ? 'check-circle' : 'radio-button-unchecked'} size={18} color={activo ? '#fff' : colors.textMuted} />
                  <Text style={[styles.horaText, activo && { color: '#fff' }]}>{ETIQUETA_AVISO[a]}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.info}>
            <MaterialIcons name="info" size={18} color={colors.textMuted} />
            <Text style={styles.infoText}>
              Te enviaremos una notificación local en este celular para preparar el canil y coordinar el traslado.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.pie, { paddingBottom: 14 + bottom }]}>
        <Pressable style={[styles.cta, !completo && styles.ctaGris]} disabled={!completo || guardando} onPress={confirmar}>
          {guardando ? <ActivityIndicator color="#fff" /> : <MaterialIcons name="event-available" size={20} color="#fff" />}
          <Text style={styles.ctaText}>{!caso ? 'Elegí un caso' : !hora ? 'Elegí un horario' : 'Confirmar turno'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function TarjetaClinica({ clinica: c }: { clinica: Clinica }) {
  return (
    <View style={styles.clinica}>
      <View style={styles.clinicaTop}>
        <View style={styles.clinicaIcono}>
          <MaterialIcons name={c.tipo === 'consultorio' ? 'medical-services' : 'local-hospital'} size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.clinicaNombre}>{c.nombre}</Text>
          {!!c.medico && <Text style={styles.clinicaMedico}>{c.medico}</Text>}
        </View>
        <View style={[styles.estado, !c.abierto && { backgroundColor: colors.surfaceChip }]}>
          <View style={[styles.estadoPunto, !c.abierto && { backgroundColor: colors.textSubtle }]} />
          <Text style={[styles.estadoText, !c.abierto && { color: colors.textMuted }]}>{c.abierto ? 'Abierto' : 'Cerrado'}</Text>
        </View>
      </View>
      <View style={styles.clinicaLugar}>
        <MaterialIcons name="location-on" size={16} color={colors.atencion} />
        <Text style={styles.clinicaLugarText}>{c.barrio}, {c.direccion}</Text>
      </View>
    </View>
  );
}

const sombra = { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 1, shadowOffset: { width: 0, height: 1 }, elevation: 1 };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  main: { padding: 16, gap: 18 },
  card: { padding: 14, borderRadius: 16, backgroundColor: colors.surface, gap: 10, ...sombra },
  casoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  foto: { width: 64, height: 64, borderRadius: 12 },
  casoNombre: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  casoDesc: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  casoResumen: { fontFamily: fonts.bold, fontSize: 14, color: colors.atencion },
  prioridad: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  prioridadText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  casoOpcion: { alignItems: 'center', gap: 4, padding: 8, borderRadius: 12, backgroundColor: colors.surfaceCard },
  casoOpcionFoto: { width: 56, height: 56, borderRadius: 9999 },
  casoOpcionNombre: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  link: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },

  bloque: { gap: 10 },
  seccionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  seccion: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  fechaCampo: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.surface, ...sombra },
  fechaText: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 9999, backgroundColor: colors.surfaceChip },
  chipActivo: { backgroundColor: colors.primary },
  chipText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },

  horas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hora: { width: '48.5%', height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 8, backgroundColor: colors.surface, ...sombra },
  horaActiva: { backgroundColor: colors.primary },
  horaText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  aviso: { flex: 1, minWidth: '47%', height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 8, backgroundColor: colors.surface, ...sombra },

  clinica: { gap: 10, padding: 14, borderRadius: 12, backgroundColor: colors.surface, ...sombra },
  clinicaTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clinicaIcono: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#cfe4e2' },
  clinicaNombre: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  clinicaMedico: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 9999, backgroundColor: colors.aldiaBg },
  estadoPunto: { width: 7, height: 7, borderRadius: 9999, backgroundColor: colors.aldia },
  estadoText: { fontFamily: fonts.bold, fontSize: 13, color: colors.aldiaText },
  clinicaLugar: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clinicaLugarText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },

  notas: { minHeight: 90, padding: 14, borderRadius: 12, backgroundColor: colors.surface, fontFamily: fonts.regular, fontSize: 15, color: colors.text, ...sombra },
  info: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 12, backgroundColor: colors.surfaceCard },
  infoText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted },

  pie: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: 'rgba(252,249,244,0.96)' },
  cta: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 9999, backgroundColor: colors.primary },
  ctaGris: { opacity: 0.45 },
  ctaText: { fontFamily: fonts.semibold, fontSize: 16, color: '#fff' },
});
