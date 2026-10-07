import { MaterialIcons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Caso } from '../../domain/models/Caso';
import { colors, fonts } from '../theme';
import { UrgenciaBadge } from './UrgenciaBadge';

const COLOR_DIAS = { urgente: colors.urgente, atencion: colors.atencion, aldia: colors.aldia };

export function CasoCard({ caso, onPress }: { caso: Caso; onPress?: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      <View style={styles.body}>
        <Image source={caso.foto} style={styles.foto} />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.nombre}>{caso.nombre}</Text>
            <UrgenciaBadge urgencia={caso.urgencia} />
          </View>
          <View style={styles.metaRow}>
            <View style={styles.species}>
              <Text style={styles.speciesText} numberOfLines={1}>{caso.descripcion}</Text>
            </View>
            <Text style={styles.dot}>•</Text>
            <Text style={[styles.dias, { color: COLOR_DIAS[caso.urgencia] }]}>
              {caso.diasEnEspera} {caso.diasEnEspera === 1 ? 'día' : 'días'} en espera
            </Text>
          </View>
          <Text style={styles.estado}>
            <Text style={styles.estadoLabel}>Estado: </Text>
            {caso.estado}
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        <View style={styles.location}>
          <MaterialIcons
            name={caso.ubicacionTipo === 'veterinaria' ? 'local-hospital' : 'location-on'}
            size={16}
            color={colors.textSubtle}
          />
          <Text style={styles.locationText}>{caso.ubicacion}</Text>
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>Ver ficha</Text>
          <MaterialIcons name="chevron-right" size={18} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' },
  body: { flexDirection: 'row', gap: 14, padding: 14 },
  foto: { width: 80, height: 80, borderRadius: 12 },
  info: { flex: 1, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nombre: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  species: { backgroundColor: colors.surfaceChip, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, flexShrink: 1 },
  speciesText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  dot: { fontFamily: fonts.regular, fontSize: 13, color: colors.placeholder },
  dias: { fontFamily: fonts.bold, fontSize: 13, flexShrink: 0 },
  estado: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  estadoLabel: { fontFamily: fonts.regular, color: colors.textSubtle },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceFooter, paddingHorizontal: 14, paddingVertical: 10 },
  location: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ctaText: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
});
