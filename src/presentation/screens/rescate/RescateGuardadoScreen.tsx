import { MaterialIcons } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackHeader } from '../../components/StackHeader';
import { UrgenciaBadge } from '../../components/UrgenciaBadge';
import { useCaso } from '../../hooks/useCaso';
import { colors, fonts } from '../../theme';
import { AvatarPerfil } from './BarraRescate';

type Params = { casoId: string; sinConexion: boolean };

export function RescateGuardadoScreen({ route, navigation }: { route?: { params?: Params }; navigation?: any }) {
  const { bottom } = useSafeAreaInsets();
  const p = route?.params;
  const { caso } = useCaso(p?.casoId ?? '');
  if (!p || !caso) return <View style={styles.screen} />;

  const irALista = () => navigation?.popTo?.('Main');

  return (
    <View style={styles.screen}>
      <StackHeader
        titulo="Confirmación De Rescate"
        icono="close"
        onBack={irALista}
        tituloColor={colors.primary}
        derecha={<AvatarPerfil />}
      />
      <ScrollView contentContainerStyle={[styles.main, { paddingBottom: 32 + bottom }]}>
        <View style={styles.hero}>
          <View style={styles.anillo}>
            <View style={styles.check}>
              <MaterialIcons name="check" size={44} color="#fff" />
            </View>
            <View style={styles.pata}>
              <MaterialIcons name="pets" size={16} color={colors.primary} />
            </View>
          </View>
          <View style={styles.sync}>
            <MaterialIcons name={p.sinConexion ? 'cloud-off' : 'cloud-done'} size={16} color={colors.textMuted} />
            <Text style={styles.syncText}>{p.sinConexion ? 'Guardado sin conexión' : 'Sincronizado'}</Text>
          </View>
          <Text style={styles.titulo}>¡Rescate guardado en tu teléfono!</Text>
          <Text style={styles.subtitulo}>
            {p.sinConexion
              ? 'El caso quedó almacenado en la memoria del dispositivo. Se sincronizará con la base central de PERF apenas tengas señal móvil o Wi-Fi.'
              : 'El caso quedó guardado y ya aparece en la lista de casos activos.'}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.casoRow}>
            <Image
              source={caso.fotoUri ? { uri: caso.fotoUri } : require('../../../../assets/images/casos/misho.jpg')}
              style={styles.foto}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.nombreRow}>
                <Text style={styles.nombre} numberOfLines={1}>{caso.nombreProvisorio}</Text>
                <UrgenciaBadge urgencia={caso.esUrgente ? 'urgente' : 'aldia'} />
              </View>
              <Text style={styles.descripcion} numberOfLines={1}>
                {caso.especie} · {caso.edadEstimada}
              </Text>
            </View>
          </View>

          <View style={styles.datos}>
            <View style={styles.dato}>
              <View style={styles.datoTitulo}>
                <MaterialIcons name="location-on" size={14} color={colors.primary} />
                <Text style={styles.datoLabel}>Punto de rescate</Text>
              </View>
              <Text style={styles.datoValor} numberOfLines={1}>{caso.barrio}</Text>
              {caso.coordenadas && (
                <Text style={styles.datoSub} numberOfLines={1}>
                  GPS: {caso.coordenadas.latitud.toFixed(4)}, {caso.coordenadas.longitud.toFixed(4)}
                </Text>
              )}
            </View>
            <View style={styles.dato}>
              <View style={styles.datoTitulo}>
                <MaterialIcons name="home" size={14} color={colors.atencion} />
                <Text style={styles.datoLabel}>Hogar de tránsito</Text>
              </View>
              <Text style={styles.datoValor} numberOfLines={1}>
                {caso.transito.nombre || 'Sin asignar'}
              </Text>
              <Text style={styles.datoSub}>
                {caso.transito.telefono || 'Coordinación PERF'}
              </Text>
            </View>
          </View>

          <View style={styles.pie}>
            <View style={styles.idRow}>
              <MaterialIcons name="qr-code-2" size={16} color={colors.text} />
              <Text style={styles.idText}>ID: #{caso.id.slice(0, 8)}</Text>
            </View>
            <View style={styles.idRow}>
              <MaterialIcons name="schedule" size={14} color={colors.primary} />
              <Text style={styles.esperaText}>0 días en espera</Text>
            </View>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <Pressable style={styles.primario} onPress={() => navigation?.navigate?.('AgendarTurno', { casoId: caso.id })}>
            <MaterialIcons name="event-available" size={20} color="#fff" />
            <Text style={styles.primarioText}>Agendar primer turno veterinario</Text>
          </Pressable>
          <Pressable style={styles.secundario} onPress={irALista}>
            <MaterialIcons name="assignment" size={18} color={colors.primary} />
            <Text style={styles.secundarioText}>Ir a la lista de casos</Text>
          </Pressable>
          <Pressable style={styles.terciario} onPress={() => navigation?.replace?.('NuevoRescate')}>
            <MaterialIcons name="add-circle-outline" size={18} color={colors.textMuted} />
            <Text style={styles.terciarioText}>Registrar otro rescate</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  main: { padding: 16, gap: 16 },
  hero: { alignItems: 'center', gap: 8, paddingTop: 4 },
  anillo: { width: 100, height: 100, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: '#9cf2e8', marginBottom: 6 },
  check: { width: 80, height: 80, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  pata: { position: 'absolute', right: -4, bottom: 0, width: 32, height: 32, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.toastIcon },
  sync: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999, backgroundColor: colors.surfaceChip },
  syncText: { fontFamily: fonts.bold, fontSize: 14, color: colors.textMuted },
  titulo: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, color: colors.text, textAlign: 'center' },
  subtitulo: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: 'center' },

  card: { gap: 12, padding: 16, borderRadius: 16, backgroundColor: colors.surface },
  casoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  foto: { width: 56, height: 56, borderRadius: 12 },
  nombreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nombre: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  descripcion: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  datos: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12, backgroundColor: colors.surfaceCard },
  dato: { flex: 1, gap: 2 },
  datoTitulo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  datoLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.textMuted },
  datoValor: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  datoSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSubtle },
  pie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  idText: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  esperaText: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },

  primario: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 9999, backgroundColor: colors.brand },
  primarioText: { fontFamily: fonts.semibold, fontSize: 16, color: '#fff' },
  secundario: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 9999, backgroundColor: colors.surfaceChip },
  secundarioText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.primary },
  terciario: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  terciarioText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted },
});
