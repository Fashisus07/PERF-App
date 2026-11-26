import { MaterialIcons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Caso,
  descripcionCorta,
  diasEnEspera,
  ETIQUETA_ESTADO,
  etiquetaRelacionParaCaso,
  prioridadDeCaso,
} from '../../domain/models/Caso';
import { useCasoStore } from '../stores/useCasoStore';
import { colors, fonts } from '../theme';
import { fotoCasoSource } from './fotoCaso';
import { UbicacionCaso } from './UbicacionCaso';
import { UrgenciaBadge } from './UrgenciaBadge';

const COLOR_DIAS = { urgente: colors.urgente, atencion: colors.atencion, aldia: colors.aldia };

export function CasoCard({ caso, onPress }: { caso: Caso; onPress?: () => void }) {
  const umbral = useCasoStore((s) => s.umbralDias);
  const todosCasos = useCasoStore((s) => s.casos);
  const { urgencia, motivoUrgencia } = prioridadDeCaso(caso, umbral);
  const dias = diasEnEspera(caso);
  const fotoSource = fotoCasoSource(caso);
  const nombresPorId = new Map(todosCasos.map((c) => [c.id, c.nombreProvisorio]));
  const primeraRel =
    caso.relaciones && caso.relaciones.length > 0
      ? etiquetaRelacionParaCaso(caso.relaciones[0], caso.id, nombresPorId)
      : null;

  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      <View style={styles.body}>
        <Image source={fotoSource} style={styles.foto} />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.nombre} numberOfLines={1}>{caso.nombreProvisorio}</Text>
            </View>
            <UrgenciaBadge urgencia={urgencia} motivo={motivoUrgencia} />
          </View>

          <View style={styles.metaRow}>
            <View style={styles.species}>
              <Text style={styles.speciesText} numberOfLines={1}>
                {descripcionCorta(caso) || `${caso.especie} · ${caso.edadEstimada}`}
              </Text>
            </View>
            <Text style={styles.dot}>•</Text>
            <Text style={[styles.dias, { color: COLOR_DIAS[urgencia] }]}>
              {dias} {dias === 1 ? 'día' : 'días'} en espera
            </Text>
          </View>

          <Text style={styles.estado} numberOfLines={1}>
            <Text style={styles.estadoLabel}>Estado: </Text>
            {ETIQUETA_ESTADO[caso.estadoCaso] || caso.estadoCaso}
          </Text>

          <UbicacionCaso caso={caso} />
          {primeraRel && (
            <View style={styles.relacionRow}>
              <MaterialIcons name="family-restroom" size={14} color={colors.primary} />
              <Text style={styles.relacionText} numberOfLines={1}>
                {primeraRel.texto}
                {caso.relaciones && caso.relaciones.length > 1 ? ` (+${caso.relaciones.length - 1})` : ''}
              </Text>
            </View>
          )}
          {!!caso.creadoPorNombre && (
            <Text style={styles.autor} numberOfLines={1}>
              Rescate registrado por {caso.creadoPorNombre}
            </Text>
          )}

          <View style={styles.cta}>
            <Text style={styles.ctaText}>Ver ficha completa</Text>
            <MaterialIcons name="chevron-right" size={18} color={colors.primary} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 180,
    backgroundColor: colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  body: { flex: 1, flexDirection: 'row', gap: 14, padding: 14 },
  foto: { width: 84, height: 84, borderRadius: 12, backgroundColor: colors.surfaceChip },
  info: { flex: 1, gap: 5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  titleContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  nombre: { fontFamily: fonts.bold, fontSize: 17, color: colors.text, flexShrink: 1 },
  badgeCamada: {
    backgroundColor: colors.primarySoft || '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeCamadaText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.primary,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  relacionRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  relacionText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primary, flexShrink: 1 },
  autor: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSubtle },
  species: { backgroundColor: colors.surfaceChip, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, flexShrink: 1 },
  speciesText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted },
  dot: { color: colors.textSubtle },
  dias: { fontFamily: fonts.semibold, fontSize: 12 },
  estado: { fontFamily: fonts.regular, fontSize: 13, color: colors.text },
  estadoLabel: { fontFamily: fonts.semibold, color: colors.textMuted },
  cta: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ctaText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.primary,
  },
});
