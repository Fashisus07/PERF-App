import { MaterialIcons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { calcularUrgencia, Caso, diasEnEspera } from '../../domain/models/Caso';
import { colors, fonts } from '../theme';
import { UbicacionCaso } from './UbicacionCaso';

const FOTO_DEFAULT = require('../../../assets/images/casos/misho.jpg');

const URGENCIA = {
  urgente: { label: 'Urgente', icono: 'error', bg: colors.urgenteBg, fg: colors.urgenteText, espera: colors.urgente },
  atencion: { label: 'Atención', icono: 'schedule', bg: colors.atencionBg, fg: colors.atencionText, espera: colors.atencion },
  aldia: { label: 'Al día', icono: 'check-circle', bg: colors.aldiaBg, fg: colors.aldiaText, espera: colors.aldia },
} as const;

type Props = { caso: Caso; onFicha?: () => void; onAccion?: () => void };

export function CasoOfflineCard({ caso, onFicha, onAccion }: Props) {
  const urgencia = calcularUrgencia(caso, 10);
  const u = URGENCIA[urgencia];
  const dias = diasEnEspera(caso);
  const fotoSource = caso.fotoUri ? { uri: caso.fotoUri } : FOTO_DEFAULT;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Image source={fotoSource} style={styles.foto} />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.nombre}>{caso.nombreProvisorio}</Text>
            <View style={[styles.badge, { backgroundColor: u.bg }]}>
              <Text style={[styles.badgeText, { color: u.fg }]}>{u.label}</Text>
              <MaterialIcons name={u.icono} size={14} color={u.fg} />
            </View>
          </View>
          <UbicacionCaso caso={caso} detalle />
          <View style={styles.chips}>
            <View style={styles.chip}>
              <Text style={[styles.chipText, { color: colors.textMuted }]}>
                Espera: {dias} {dias === 1 ? 'día' : 'días'}
              </Text>
              <MaterialIcons name="access-time" size={13} color={u.espera} />
            </View>
            <View style={[styles.chip, styles.chipLocal]}>
              <Text style={[styles.chipText, { color: colors.primary }]}>Guardado local</Text>
              <MaterialIcons name="cloud-done" size={13} color={colors.primary} />
            </View>
          </View>
        </View>
      </View>

      {caso.historiaOrigen ? (
        <View style={styles.nota}>
          <Text style={styles.notaText}>{caso.historiaOrigen}</Text>
        </View>
      ) : null}

      <View style={styles.botones}>
        {caso.transito.telefono ? (
          <Pressable style={[styles.btn, styles.btnSecundario]} onPress={onAccion}>
            <Text style={styles.btnSecundarioText}>Llamar tránsito</Text>
            <MaterialIcons name="phone" size={16} color={colors.primary} />
          </Pressable>
        ) : null}
        <Pressable style={[styles.btn, styles.btnPrimario]} onPress={onFicha}>
          <Text style={styles.btnPrimarioText}>Ver ficha</Text>
          <MaterialIcons name="edit-note" size={18} color={colors.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 12 },
  top: { flexDirection: 'row', gap: 12 },
  foto: { width: 72, height: 72, borderRadius: 12 },
  info: { flex: 1, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nombre: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 9999 },
  badgeText: { fontFamily: fonts.semibold, fontSize: 13 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceChip, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  chipLocal: { backgroundColor: colors.bannerInfo },
  chipText: { fontFamily: fonts.semibold, fontSize: 12 },
  nota: { backgroundColor: colors.surfaceCard, borderRadius: 8, padding: 12 },
  notaText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  botones: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, height: 44, borderRadius: 9999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnSecundario: { backgroundColor: colors.surfaceChip },
  btnSecundarioText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted },
  btnPrimario: { backgroundColor: colors.primary },
  btnPrimarioText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.onPrimary },
});
