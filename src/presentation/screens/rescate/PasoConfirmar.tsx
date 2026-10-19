import { MaterialIcons } from '@expo/vector-icons';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BorradorRescate,
  ETIQUETA_EDAD,
  ETIQUETA_ESPECIE,
  ETIQUETA_TRIAJE,
  urgenciaDeTriaje,
} from '../../../domain/models/Rescate';
import { colors, fonts } from '../../theme';
import { SegmentosPaso } from './BarraRescate';

type Props = {
  borrador: BorradorRescate;
  sinConexion: boolean;
  guardando: boolean;
  onVolver: () => void;
  onGuardar: () => void;
};

const ALERTA = {
  urgente: { texto: 'Atención requerida', icono: 'error', fondo: '#ffe9d5', color: colors.atencion },
  atencion: { texto: 'Requiere seguimiento', icono: 'schedule', fondo: '#fff1e0', color: colors.atencion },
  aldia: { texto: 'Sin urgencia aparente', icono: 'check-circle', fondo: colors.aldiaBg, color: colors.aldia },
} as const;

export function PasoConfirmar({ borrador: b, sinConexion, guardando, onVolver, onGuardar }: Props) {
  const alerta = ALERTA[urgenciaDeTriaje(b.triaje)];
  const fecha = new Date(b.fecha);
  const hora = `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
  const nombre = b.nombre.trim() || 'Sin nombre';

  return (
    <View style={styles.root}>
      <View style={styles.pasoRow}>
        <Text style={styles.pasoText}>
          <Text style={styles.pasoBold}>Paso 3 de 3</Text> · Confirmación
        </Text>
        <Pressable style={styles.volver} onPress={onVolver}>
          <MaterialIcons name="arrow-back" size={16} color={colors.text} />
          <Text style={styles.volverText}>Volver</Text>
        </Pressable>
      </View>
      <SegmentosPaso paso={3} />

      <View style={styles.card}>
        <View style={styles.hero}>
          {b.fotoUri ? (
            <Image source={{ uri: b.fotoUri }} style={styles.heroImg} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImg, styles.heroVacio]}>
              <MaterialIcons name="pets" size={56} color={colors.textSubtle} />
            </View>
          )}
          <View style={styles.badgeNuevo}>
            <View style={styles.punto} />
            <Text style={styles.badgeNuevoText}>Nuevo rescate</Text>
          </View>
        </View>
        <View style={[styles.alerta, { backgroundColor: alerta.fondo }]}>
          <View style={styles.alertaIzq}>
            <MaterialIcons name={alerta.icono} size={18} color={alerta.color} />
            <Text style={[styles.alertaText, { color: alerta.color }]}>{alerta.texto}</Text>
          </View>
          <View style={styles.alertaIzq}>
            <MaterialIcons name="schedule" size={14} color={colors.textMuted} />
            <Text style={styles.alertaHora}>Hoy · {hora}</Text>
          </View>
        </View>

        <View style={styles.cuerpo}>
          <View style={styles.nombreRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nombre}>{nombre}</Text>
              <Text style={styles.sub}>
                {b.especie ? ETIQUETA_ESPECIE[b.especie] : ''} · {b.edad ? ETIQUETA_EDAD[b.edad] : ''}
              </Text>
            </View>
            <View style={styles.pata}>
              <MaterialIcons name="pets" size={22} color={colors.primary} />
            </View>
          </View>

          <View style={styles.lugar}>
            <View style={styles.lugarIcono}>
              <MaterialIcons name="location-on" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.lugarBarrio}>{b.barrio || b.lugar}</Text>
              {!!b.barrio && !!b.lugar && <Text style={styles.lugarSub}>{b.lugar}</Text>}
              {!!b.coordenadas && (
                <Text style={styles.lugarSub}>
                  GPS {b.coordenadas.lat.toFixed(4)}, {b.coordenadas.lng.toFixed(4)}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.resenaTitulo}>
            <MaterialIcons name="health-and-safety" size={14} color={colors.textMuted} />
            <Text style={styles.resenaLabel}>RESEÑA SANITARIA</Text>
          </View>
          <View style={styles.notas}>
            <Text style={styles.notasText}>{b.notas.trim() || 'Sin observaciones cargadas.'}</Text>
          </View>
          {b.triaje.length > 0 && (
            <View style={styles.tags}>
              {b.triaje.map((t) => (
                <View key={t} style={styles.tag}>
                  <Text style={styles.tagText}>{ETIQUETA_TRIAJE[t]}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.banner}>
        <View style={styles.bannerIcono}>
          <MaterialIcons name={sinConexion ? 'cloud-off' : 'cloud-done'} size={26} color="#fff" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.bannerTitulo}>
            {sinConexion ? 'Se guarda en tu teléfono, aunque no tengas conexión.' : 'Se guarda en tu teléfono y en la red de PERF.'}
          </Text>
          <Text style={styles.bannerTexto}>
            {sinConexion
              ? 'Se sincronizará automáticamente con la red de PERF en cuanto recuperes señal de datos o Wi-Fi.'
              : 'Vas a poder verlo enseguida en la lista de casos.'}
          </Text>
        </View>
      </View>

      <Pressable style={[styles.guardar, guardando && { opacity: 0.7 }]} onPress={onGuardar} disabled={guardando}>
        {guardando ? <ActivityIndicator color="#fff" /> : <MaterialIcons name="check-circle-outline" size={22} color="#fff" />}
        <Text style={styles.guardarText}>Guardar rescate</Text>
      </Pressable>
      <Pressable style={styles.editar} onPress={onVolver} disabled={guardando}>
        <MaterialIcons name="edit-note" size={20} color={colors.text} />
        <Text style={styles.editarText}>Editar datos cargados</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12, paddingHorizontal: 16, paddingTop: 4 },
  pasoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pasoText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  pasoBold: { fontFamily: fonts.bold, color: colors.primary },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  volverText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },

  card: { borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surface },
  hero: { height: 180 },
  heroImg: { width: '100%', height: '100%' },
  heroVacio: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  badgeNuevo: { position: 'absolute', left: 14, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.95)' },
  punto: { width: 8, height: 8, borderRadius: 9999, backgroundColor: colors.primary },
  badgeNuevoText: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  alerta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  alertaIzq: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  alertaText: { fontFamily: fonts.bold, fontSize: 14 },
  alertaHora: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  cuerpo: { gap: 10, padding: 16 },
  nombreRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nombre: { fontFamily: fonts.bold, fontSize: 26, color: colors.text },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  pata: { width: 40, height: 40, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#9cf2e8' },
  lugar: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, backgroundColor: colors.surfaceCard },
  lugarIcono: { width: 34, height: 34, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  lugarBarrio: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  lugarSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  resenaTitulo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  resenaLabel: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.4, color: colors.textMuted },
  notas: { padding: 14, borderRadius: 12, backgroundColor: colors.surfaceCard },
  notasText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.text },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9999, backgroundColor: colors.surfaceChip },
  tagText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },

  banner: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, backgroundColor: colors.brand },
  bannerIcono: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' },
  bannerTitulo: { fontFamily: fonts.bold, fontSize: 15, color: '#fff' },
  bannerTexto: { fontFamily: fonts.regular, fontSize: 13, color: '#cfe4e2' },

  guardar: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 9999, backgroundColor: colors.primary },
  guardarText: { fontFamily: fonts.semibold, fontSize: 17, color: '#fff' },
  editar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 9999, backgroundColor: colors.surfaceChip },
  editarText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
});
