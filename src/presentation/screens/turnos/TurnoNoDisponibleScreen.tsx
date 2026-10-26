import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Clinica,
  diaCorto,
  diaLargo,
  duracionCorta,
  ETIQUETA_MOTIVO,
  horaDe,
  MotivoConsulta,
  AvisoTurno,
  SolicitudTurno,
} from '../../../domain/models/Turno';
import { CupoNoDisponible } from '../../../domain/usecases/AgendarTurno';
import { StackHeader } from '../../components/StackHeader';
import { UrgenciaBadge } from '../../components/UrgenciaBadge';
import { useCaso } from '../../hooks/useCaso';
import { agendarTurno, obtenerClinicas } from '../../hooks/useTurnos';
import { colors, fonts } from '../../theme';
import { AvatarPerfil } from '../rescate/BarraRescate';

type Params = {
  solicitud: { casoId: string; clinicaId: string; fecha: string; motivo: MotivoConsulta; notas?: string; avisos: AvisoTurno[] };
  opciones: { fecha: string; espera: number }[];
};

// Se muestra cuando el horario elegido ya fue reservado por otra guardia.
export function TurnoNoDisponibleScreen({ route, navigation }: { route?: { params?: Params }; navigation?: any }) {
  const { bottom } = useSafeAreaInsets();
  const p = route?.params;
  const { caso } = useCaso(p?.solicitud.casoId ?? '');
  const [clinica, setClinica] = useState<Clinica>();
  const [eligiendo, setEligiendo] = useState<string | null>(null);

  useEffect(() => {
    obtenerClinicas().then((cs) => setClinica(cs.find((c) => c.id === p?.solicitud.clinicaId)));
  }, [p?.solicitud.clinicaId]);

  if (!p || !caso || !clinica) return <View style={styles.screen} />;

  const pedido = new Date(p.solicitud.fecha);
  const volverALaFicha = () => navigation?.popTo?.('DetalleCaso', { casoId: caso.id });

  // Reserva directamente la alternativa elegida, sin volver a cargar datos.
  const seleccionar = async (iso: string) => {
    setEligiendo(iso);
    const fechaHora = new Date(iso).getTime();
    const solicitud: SolicitudTurno = {
      casoId: p.solicitud.casoId,
      centroVeterinarioId: p.solicitud.clinicaId,
      fechaHora,
      motivo: p.solicitud.motivo,
      recordatorioMinutos: 120,
    };
    try {
      const r = await agendarTurno.ejecutar(solicitud, caso);
      navigation?.replace?.('TurnoAgendado', { turnoId: r.turno.id, avisosProgramados: ['2horas'] });
    } catch (e) {
      if (e instanceof CupoNoDisponible) {
        navigation?.replace?.('TurnoNoDisponible', {
          solicitud: p.solicitud,
          opciones: e.opciones.map((o) => ({ fecha: o.fecha.toISOString(), espera: o.espera })),
        });
      }
      setEligiendo(null);
    }
  };

  const fotoCaso = caso.fotoUri ? { uri: caso.fotoUri } : require('../../../../assets/images/casos/misho.jpg');

  return (
    <View style={styles.screen}>
      <StackHeader titulo="Ficha Triage Médico" icono="close" onBack={volverALaFicha} derecha={<AvatarPerfil />} />
      <ScrollView contentContainerStyle={[styles.main, { paddingBottom: 32 + bottom }]}>
        <View style={styles.hero}>
          <View style={styles.circulo}>
            <MaterialIcons name="event-busy" size={40} color={colors.urgente} />
            <View style={styles.alerta}>
              <MaterialIcons name="priority-high" size={14} color="#fff" />
            </View>
          </View>
          <View style={styles.badgeCupo}>
            <MaterialIcons name="error-outline" size={13} color={colors.urgenteText} />
            <Text style={styles.badgeCupoText}>Cupo no disponible</Text>
          </View>
          <Text style={styles.titulo}>No pudimos confirmar el turno</Text>
          <Text style={styles.subtitulo}>
            La <Text style={styles.negrita}>{clinica.nombre}</Text> ya no tiene cupos para el{' '}
            <Text style={styles.rojo}>{diaLargo(pedido).split(' de ')[0]} a las {horaDe(pedido)} hs</Text>. Fue reservado por otra
            guardia hace instantes.
          </Text>
        </View>

        <View style={styles.afectada}>
          <View style={styles.afectadaTop}>
            <Text style={styles.afectadaTitulo}>Solicitud afectada</Text>
            <UrgenciaBadge urgencia={caso.esUrgente ? 'urgente' : 'aldia'} />
          </View>
          <View style={styles.casoCard}>
            <View style={styles.casoRow}>
              <Image source={fotoCaso} style={styles.foto} />
              <View style={{ flex: 1 }}>
                <Text style={styles.casoNombre}>
                  {caso.nombreProvisorio} <Text style={styles.casoSub}>· {caso.especie} ({caso.edadEstimada})</Text>
                </Text>
                <Text style={styles.casoMotivo}>{ETIQUETA_MOTIVO[p.solicitud.motivo] || p.solicitud.motivo}</Text>
              </View>
            </View>
            <View style={styles.tachado}>
              <MaterialIcons name="event-busy" size={16} color={colors.urgente} />
              <Text style={styles.tachadoText}>{diaCorto(pedido)} · {horaDe(pedido)} hs</Text>
              <View style={styles.agotado}>
                <Text style={styles.agotadoText}>Agotado</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.opcionesTitulo}>
          <View style={styles.opcionesIzq}>
            <MaterialIcons name="bolt" size={18} color={colors.primary} />
            <Text style={styles.opcionesText}>Opciones inmediatas sugeridas</Text>
          </View>
          <Text style={styles.sinReingresar}>Sin reingresar datos</Text>
        </View>

        {p.opciones.length === 0 && <Text style={styles.sinOpciones}>No hay cupos libres en los próximos días en esta clínica.</Text>}
        {p.opciones.map((o, i) => {
          const f = new Date(o.fecha);
          const primera = i === 0;
          return (
            <View key={o.fecha} style={[styles.opcion, primera && styles.opcionPrimera]}>
              <View style={styles.opcionTop}>
                <Text style={styles.opcionFecha}>
                  {diaLargo(f).replace(' de ', ' ')} · {horaDe(f)} hs
                </Text>
                {primera && (
                  <View style={styles.proximo}>
                    <Text style={styles.proximoText}>Más próximo</Text>
                  </View>
                )}
              </View>
              <Text style={styles.opcionSub}>
                Misma clínica{clinica.medico ? ` · ${clinica.medico}` : ''} (+{duracionCorta(o.espera)} de espera)
              </Text>
              <View style={styles.opcionPie}>
                <View style={styles.libre}>
                  <MaterialIcons name="check-circle-outline" size={16} color={colors.aldia} />
                  <Text style={styles.libreText}>Cupo libre verificado</Text>
                </View>
                <Pressable
                  style={[styles.seleccionar, primera ? styles.seleccionarPrimaria : styles.seleccionarSecundaria]}
                  onPress={() => seleccionar(o.fecha)}
                  disabled={!!eligiendo}
                >
                  {eligiendo === o.fecha ? (
                    <ActivityIndicator color={primera ? '#fff' : colors.primary} />
                  ) : (
                    <Text style={[styles.seleccionarText, !primera && { color: colors.text }]}>Seleccionar</Text>
                  )}
                </Pressable>
              </View>
            </View>
          );
        })}

        <View style={styles.guardia}>
          <View style={styles.guardiaIcono}>
            <MaterialIcons name="emergency" size={20} color={colors.urgente} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.guardiaTitulo}>Guardia 24hs Nodo Balvanera</Text>
            <Text style={styles.guardiaTexto}>Atención espontánea sin turno</Text>
          </View>
          <Pressable style={styles.derivar} onPress={() => navigation?.replace?.('CambioEstado', { casoId: caso.id })}>
            <Text style={styles.derivarText}>Derivar</Text>
            <MaterialIcons name="arrow-forward" size={16} color={colors.text} />
          </Pressable>
        </View>

        <View style={{ gap: 10 }}>
          <Pressable
            style={styles.primario}
            onPress={() => navigation?.replace?.('AgendarTurno', { casoId: caso.id })}
          >
            <MaterialIcons name="event" size={20} color="#fff" />
            <Text style={styles.primarioText}>Ver todos los horarios disponibles</Text>
          </Pressable>
          <Pressable style={styles.secundario} onPress={() => Linking.openURL(`tel:${clinica.telefono}`)}>
            <MaterialIcons name="call" size={18} color={colors.primary} />
            <Text style={styles.secundarioText}>Llamar a {clinica.nombre.replace('Clínica Veterinaria ', '')} directamente</Text>
          </Pressable>
          <Pressable style={styles.terciario} onPress={volverALaFicha}>
            <Text style={styles.terciarioText}>Volver a la ficha de {caso.nombreProvisorio} sin cambios</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  main: { padding: 16, gap: 14 },
  hero: { alignItems: 'center', gap: 8 },
  circulo: { width: 80, height: 80, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.urgenteBg },
  alerta: { position: 'absolute', right: -4, bottom: 2, width: 24, height: 24, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bannerWarnIcon },
  badgeCupo: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 9999, backgroundColor: colors.urgenteBg },
  badgeCupoText: { fontFamily: fonts.bold, fontSize: 13, color: colors.urgenteText },
  titulo: { fontFamily: fonts.bold, fontSize: 24, color: colors.text, textAlign: 'center' },
  subtitulo: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: 'center' },
  negrita: { fontFamily: fonts.bold, color: colors.text },
  rojo: { fontFamily: fonts.semibold, color: colors.urgente },

  afectada: { gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.surfaceCard },
  afectadaTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  afectadaTitulo: { fontFamily: fonts.bold, fontSize: 14, color: colors.textMuted },
  casoCard: { gap: 10, padding: 12, borderRadius: 12, backgroundColor: colors.surface },
  casoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  foto: { width: 52, height: 52, borderRadius: 8 },
  casoNombre: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  casoSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  casoMotivo: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  tachado: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8, backgroundColor: colors.surfaceMuted },
  tachadoText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.textSubtle, textDecorationLine: 'line-through' },
  agotado: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.surface },
  agotadoText: { fontFamily: fonts.bold, fontSize: 13, color: colors.urgenteText },

  opcionesTitulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  opcionesIzq: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  opcionesText: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  sinReingresar: { maxWidth: 100, fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted, textAlign: 'right' },
  sinOpciones: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  opcion: { gap: 6, padding: 14, borderRadius: 12, backgroundColor: colors.surface },
  opcionPrimera: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  opcionTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  opcionFecha: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  proximo: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 9999, backgroundColor: colors.atencionBg },
  proximoText: { fontFamily: fonts.bold, fontSize: 13, color: colors.atencionText },
  opcionSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  opcionPie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  libre: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  libreText: { fontFamily: fonts.regular, fontSize: 14, color: colors.aldia },
  seleccionar: { minWidth: 110, height: 42, paddingHorizontal: 18, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  seleccionarPrimaria: { backgroundColor: colors.primary },
  seleccionarSecundaria: { backgroundColor: colors.surfaceChip },
  seleccionarText: { fontFamily: fonts.semibold, fontSize: 14, color: '#fff' },

  guardia: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, backgroundColor: colors.surfaceChip },
  guardiaIcono: { width: 44, height: 44, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.urgenteBg },
  guardiaTitulo: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  guardiaTexto: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  derivar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, height: 40, borderRadius: 9999, backgroundColor: colors.surface },
  derivarText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },

  primario: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 9999, backgroundColor: colors.brand },
  primarioText: { fontFamily: fonts.semibold, fontSize: 15, color: '#fff' },
  secundario: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 9999, backgroundColor: colors.surfaceChip },
  secundarioText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
  terciario: { height: 44, alignItems: 'center', justifyContent: 'center' },
  terciarioText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
});
