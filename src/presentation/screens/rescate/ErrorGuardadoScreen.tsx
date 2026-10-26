import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorradorRescate } from '../../../domain/models/Rescate';
import { ETIQUETA_ESPECIE } from '../../../domain/models/Caso';
import { StackHeader } from '../../components/StackHeader';
import { useOnline } from '../../hooks/useOnline';
import { useRegistrarRescate } from '../../hooks/useRegistrarRescate';
import { colors, fonts } from '../../theme';
import { AvatarPerfil } from './BarraRescate';

type Params = { borrador: BorradorRescate; motivo?: string };

const LOGO = require('../../../../assets/images/logo.png');

// Se muestra cuando falló el guardado: el borrador no se pierde y se puede reintentar o exportar.
export function ErrorGuardadoScreen({ route, navigation }: { route?: { params?: Params }; navigation?: any }) {
  const { bottom } = useSafeAreaInsets();
  const online = useOnline();
  const registrar = useRegistrarRescate();
  const [reintentando, setReintentando] = useState(false);
  const [falloOtraVez, setFalloOtraVez] = useState(false);
  const p = route?.params;
  if (!p) return <View style={styles.screen} />;
  const b = p.borrador;

  const volverAlFormulario = () => navigation?.replace?.('NuevoRescate', { borrador: b, paso: 2 });

  const reintentar = async () => {
    setReintentando(true);
    setFalloOtraVez(false);
    try {
      const caso = await registrar.ejecutar(b, !online);
      navigation?.replace?.('RescateGuardado', { casoId: caso.id, sinConexion: !online });
    } catch {
      setFalloOtraVez(true);
    } finally {
      setReintentando(false);
    }
  };

  // Comparte un resumen en texto por WhatsApp, notas, mail, etc.
  const exportar = () =>
    Share.share({
      message: [
        `RESCATE PERF (borrador): ${b.nombreProvisorio.trim() || 'Sin nombre'}`,
        `${b.especie ? ETIQUETA_ESPECIE[b.especie] : ''} · ${b.edadEstimada}`,
        `Barrio: ${b.barrio}`,
        b.coordenadas ? `GPS: ${b.coordenadas.latitud.toFixed(5)}, ${b.coordenadas.longitud.toFixed(5)}` : '',
        b.historiaOrigen ? `Historia: ${b.historiaOrigen}` : '',
        b.transitoNombre ? `Tránsito: ${b.transitoNombre} (${b.transitoTelefono})` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    });

  return (
    <View style={styles.screen}>
      <StackHeader
        titulo="Contingencia Ingreso Urgente"
        icono="close"
        onBack={volverAlFormulario}
        derecha={<AvatarPerfil />}
      />
      <ScrollView contentContainerStyle={[styles.main, { paddingBottom: 32 + bottom }]}>
        <View style={styles.hero}>
          <View style={styles.iconoCirculo}>
            <MaterialIcons name="cloud-off" size={44} color={colors.atencion} />
            <View style={styles.exclamacion}>
              <MaterialIcons name="priority-high" size={16} color="#fff" />
            </View>
          </View>
          <Text style={styles.titulo}>No se pudo guardar el rescate</Text>
          <Text style={styles.subtitulo}>
            Tus fotos y datos <Text style={styles.bold}>no se perdieron</Text>. Ocurrió un error al escribir en el
            almacenamiento del dispositivo o la memoria temporal está saturada.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.protegido}>
              <MaterialIcons name="bookmark" size={18} color={colors.primary} />
              <Text style={styles.protegidoText}>Borrador protegido</Text>
            </View>
            <View style={styles.cache}>
              <MaterialIcons name="check-circle" size={14} color={colors.aldiaText} />
              <Text style={styles.cacheText}>100% en caché</Text>
            </View>
          </View>
          <View style={styles.resumen}>
            {b.fotoUri ? (
              <Image source={{ uri: b.fotoUri }} style={styles.foto} />
            ) : (
              <View style={[styles.foto, styles.fotoVacia]}>
                <MaterialIcons name="pets" size={26} color={colors.textSubtle} />
              </View>
            )}
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.nombre} numberOfLines={1}>
                {b.nombreProvisorio.trim() || 'Sin nombre'}{'  '}
                <Text style={styles.especie}>{b.especie ? ETIQUETA_ESPECIE[b.especie] : ''}</Text>
              </Text>
              <View style={styles.lugarRow}>
                <MaterialIcons name="location-on" size={14} color={colors.atencion} />
                <Text style={styles.lugar} numberOfLines={1}>{b.barrio || 'Sin ubicación'}</Text>
              </View>
              {!!b.edadEstimada && (
                <View style={styles.triaje}>
                  <Text style={styles.triajeText} numberOfLines={1}>
                    Edad: {b.edadEstimada}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <MaterialIcons name="schedule" size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>Hace un momento</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcons name="photo-camera" size={14} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.primary }]}>
                {b.fotoUri ? '1 foto adjunta' : 'Sin fotos'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.diagnostico}>
          <View style={styles.infoIcono}>
            <MaterialIcons name="info-outline" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.diagTitulo}>Diagnóstico de campo</Text>
            <Text style={styles.diagTexto}>
              {p.motivo ? `${p.motivo}. ` : ''}Espacio de memoria local insuficiente o permiso de almacenamiento revocado.
              Podés reintentar ahora o reenviar una copia de respaldo inmediato por WhatsApp.
            </Text>
            {falloOtraVez && <Text style={styles.sigueFallando}>Sigue fallando: probá exportar el borrador.</Text>}
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <Pressable style={styles.primario} onPress={reintentar} disabled={reintentando}>
            {reintentando ? <ActivityIndicator color="#fff" /> : <MaterialIcons name="sync" size={20} color="#fff" />}
            <Text style={styles.primarioText}>Reintentar guardado</Text>
          </Pressable>
          <Pressable style={styles.exportar} onPress={exportar}>
            <MaterialIcons name="share" size={18} color={colors.primary} />
            <Text style={styles.exportarText}>Exportar borrador rápido (WhatsApp / Notas)</Text>
          </Pressable>
          <Pressable style={styles.editar} onPress={volverAlFormulario}>
            <MaterialIcons name="edit-note" size={18} color={colors.textMuted} />
            <Text style={styles.editarText}>Volver al formulario para editar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  main: { padding: 16, gap: 16 },
  hero: { alignItems: 'center', gap: 10, paddingTop: 4 },
  iconoCirculo: { width: 96, height: 96, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffdcc3' },
  exclamacion: { position: 'absolute', right: -6, bottom: 0, width: 28, height: 28, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.urgente },
  titulo: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, color: colors.text, textAlign: 'center' },
  subtitulo: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: 'center' },
  bold: { fontFamily: fonts.bold, color: colors.text },

  card: { gap: 12, padding: 16, borderRadius: 16, backgroundColor: colors.surface },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  protegido: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  protegidoText: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  cache: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, backgroundColor: colors.toastIcon },
  cacheText: { fontFamily: fonts.bold, fontSize: 13, color: colors.aldiaText },
  resumen: { flexDirection: 'row', gap: 12 },
  foto: { width: 72, height: 72, borderRadius: 8 },
  fotoVacia: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  nombre: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  especie: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted },
  lugarRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lugar: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  triaje: { alignSelf: 'flex-start', maxWidth: '100%', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.surfaceCard },
  triajeText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 10, backgroundColor: colors.surfaceCard },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: fonts.bold, fontSize: 13, color: colors.textMuted },

  diagnostico: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 16, backgroundColor: colors.surfaceChip },
  infoIcono: { width: 36, height: 36, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bannerWarnIcon },
  diagTitulo: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  diagTexto: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  sigueFallando: { marginTop: 4, fontFamily: fonts.bold, fontSize: 13, color: colors.urgente },

  primario: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 9999, backgroundColor: colors.primary },
  primarioText: { fontFamily: fonts.semibold, fontSize: 16, color: '#fff' },
  exportar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 9999, backgroundColor: colors.surface },
  exportarText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
  editar: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  editarText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted },
});
