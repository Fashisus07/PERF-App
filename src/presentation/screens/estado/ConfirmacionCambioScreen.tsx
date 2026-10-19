import { MaterialIcons } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EstadoCaso, ETIQUETA_ESTADO } from '../../../domain/models/Caso';
import { StackHeader } from '../../components/StackHeader';
import { useCaso } from '../../hooks/useCaso';
import { colors, fonts } from '../../theme';
import { infoEstado } from './estadosCaso';

type Params = {
  casoId: string;
  anterior: EstadoCaso;
  nuevo: EstadoCaso;
  destino?: string;
  hora: string;
  sinConexion: boolean;
};

export function ConfirmacionCambioScreen({ route, navigation }: { route?: { params?: Params }; navigation?: any }) {
  const { bottom } = useSafeAreaInsets();
  const p = route?.params;
  const { caso } = useCaso(p?.casoId ?? '');

  if (!p || !caso) return <View style={styles.screen} />;

  const info = infoEstado(p.nuevo);
  const verFicha = () => navigation?.popTo?.('DetalleCaso', { casoId: caso.id, estadoActualizado: true });

  return (
    <View style={styles.screen}>
      <StackHeader
        titulo="Confirmación De Cambio De Estado"
        icono="close"
        onBack={verFicha}
        tituloColor={colors.primary}
        derecha={
          <View style={styles.perfil}>
            <MaterialIcons name="person" size={16} color="#fff" />
          </View>
        }
      />
      <ScrollView contentContainerStyle={[styles.main, { paddingBottom: 32 + bottom }]}>
        <View style={styles.hero}>
          <View style={styles.check}>
            <MaterialIcons name="check-circle" size={44} color={colors.primary} />
          </View>
          <View style={styles.sync}>
            <MaterialIcons name={p.sinConexion ? 'cloud-off' : 'cloud-done'} size={16} color={colors.textMuted} />
            <Text style={styles.syncText}>{p.sinConexion ? 'Guardado sin conexión' : 'Sincronizado'}</Text>
          </View>
          <Text style={styles.titulo}>¡Golazo! Estado actualizado</Text>
          <Text style={styles.subtitulo}>
            La situación de <Text style={styles.subtituloBold}>{caso.nombre}</Text> fue guardada en el registro de seguimiento.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.casoRow}>
            <Image source={caso.foto} style={styles.foto} />
            <View style={{ flex: 1 }}>
              <View style={styles.casoTop}>
                <Text style={styles.nombre}>{caso.nombre}</Text>
                <View style={styles.idBadge}>
                  <Text style={styles.idText}>ID #{caso.id}</Text>
                </View>
              </View>
              <Text style={styles.descripcion}>{caso.descripcion}</Text>
            </View>
          </View>

          <View style={styles.anterior}>
            <View style={styles.anteriorLabel}>
              <MaterialIcons name={infoEstado(p.anterior).iconoChip} size={16} color={colors.atencion} />
              <Text style={styles.anteriorLabelText}>Estado anterior</Text>
            </View>
            <View style={styles.anteriorChip}>
              <Text style={styles.anteriorChipText}>{ETIQUETA_ESTADO[p.anterior]}</Text>
            </View>
          </View>

          <View style={styles.flecha}>
            <MaterialIcons name="arrow-downward" size={16} color={colors.primary} />
          </View>

          <View style={styles.nuevo}>
            <View style={styles.nuevoLabel}>
              <MaterialIcons name={info.iconoChip} size={16} color="#fff" />
              <Text style={styles.nuevoLabelText}>Nuevo estado</Text>
            </View>
            <View style={styles.nuevoChip}>
              <MaterialIcons name="check" size={14} color="#00201d" />
              <Text style={styles.nuevoChipText}>{ETIQUETA_ESTADO[p.nuevo]}</Text>
            </View>
          </View>

          <View style={styles.detalles}>
            {!!p.destino && (
              <View style={styles.detalleFila}>
                <MaterialIcons name="place" size={18} color={colors.primary} />
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.detalleTitulo}>Destino</Text>
                  <Text style={styles.detalleTexto}>{p.destino}</Text>
                </View>
              </View>
            )}
            <View style={styles.detalleFila}>
              <MaterialIcons name="schedule" size={18} color={colors.primary} />
              <Text style={styles.detalleTexto}>Modificado hoy a las {p.hora} hs</Text>
            </View>
            <View style={styles.detalleFila}>
              <MaterialIcons name={p.sinConexion ? 'sync' : 'cloud-done'} size={18} color={colors.aldia} />
              <Text style={[styles.detalleTexto, { color: colors.aldia, flexShrink: 1 }]}>
                {p.sinConexion ? 'Almacenado localmente · Pendiente de red central' : 'Sincronizado con la red central'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.proximo}>
          <View style={styles.proximoTitulo}>
            <MaterialIcons name="lightbulb" size={20} color={colors.atencion} />
            <Text style={styles.proximoTituloText}>Próximo paso en campo</Text>
          </View>
          <Text style={styles.proximoTexto}>{info.proximoPaso}</Text>
        </View>

        <View style={{ gap: 10 }}>
          <Pressable style={styles.btnPrimario} onPress={verFicha}>
            <MaterialIcons name="assignment" size={18} color="#fff" />
            <Text style={styles.btnPrimarioText}>Ver ficha actualizada de {caso.nombre}</Text>
          </Pressable>
          <Pressable style={styles.btnVolver} onPress={() => navigation?.popTo?.('Main')}>
            <MaterialIcons name="arrow-back" size={16} color={colors.textMuted} />
            <Text style={styles.btnVolverText}>Volver a Casos activos</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const sombra = { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 1, shadowOffset: { width: 0, height: 1 }, elevation: 1 };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  main: { padding: 16, gap: 16 },
  perfil: { width: 32, height: 32, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },

  hero: { alignItems: 'center', gap: 6, paddingTop: 8 },
  check: { width: 80, height: 80, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', marginBottom: 10, backgroundColor: '#9cf2e8', ...sombra },
  sync: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999, backgroundColor: colors.surfaceChip },
  syncText: { fontFamily: fonts.bold, fontSize: 14, color: colors.textMuted },
  titulo: { fontFamily: fonts.semibold, fontSize: 22, color: colors.text, textAlign: 'center' },
  subtitulo: { maxWidth: 320, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: 'center' },
  subtituloBold: { fontFamily: fonts.semibold, color: colors.text },

  card: { gap: 12, padding: 16, borderRadius: 16, backgroundColor: colors.surface, ...sombra },
  casoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, backgroundColor: colors.surfaceCard },
  foto: { width: 48, height: 48, borderRadius: 9999 },
  casoTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nombre: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text },
  idBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: '#9cf2e8' },
  idText: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  descripcion: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },

  anterior: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 10, borderRadius: 12, backgroundColor: colors.surfaceCard },
  anteriorLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  anteriorLabelText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  anteriorChip: { flexShrink: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, backgroundColor: colors.surfaceChip, opacity: 0.85 },
  anteriorChipText: { fontFamily: fonts.bold, fontSize: 14, color: colors.textMuted, textDecorationLine: 'line-through' },
  flecha: { alignSelf: 'center', width: 28, height: 28, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#9cf2e8' },
  nuevo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.primary },
  nuevoLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nuevoLabelText: { fontFamily: fonts.semibold, fontSize: 14, color: '#fff' },
  nuevoChip: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999, backgroundColor: '#9cf2e8' },
  nuevoChipText: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 14, color: '#00201d' },

  detalles: { gap: 10, padding: 12, borderRadius: 12, backgroundColor: colors.surfaceCard },
  detalleFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detalleTitulo: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  detalleTexto: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },

  proximo: { gap: 6, padding: 16, borderRadius: 16, backgroundColor: colors.surfaceMuted, ...sombra },
  proximoTitulo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proximoTituloText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  proximoTexto: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted },

  btnPrimario: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24, borderRadius: 9999, backgroundColor: colors.primary },
  btnPrimarioText: { fontFamily: fonts.semibold, fontSize: 15, color: '#fff' },
  btnVolver: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  btnVolverText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted },
});
