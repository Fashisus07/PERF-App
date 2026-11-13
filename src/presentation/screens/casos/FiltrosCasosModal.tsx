import { MaterialIcons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EstadoCaso, ETIQUETA_ESTADO } from '../../../domain/models/Caso';
import { FiltroEstado, OrdenCasos } from '../../hooks/useCasos';
import { colors, fonts } from '../../theme';

const ORDENES: { key: OrdenCasos; titulo: string; detalle: string; icono: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: 'prioridad', titulo: 'Prioridad', detalle: 'Urgentes primero, después los que más esperan', icono: 'priority-high' },
  { key: 'ultimo_rescate', titulo: 'Último rescate', detalle: 'Los rescatados más recientemente arriba', icono: 'new-releases' },
  { key: 'mas_antiguo', titulo: 'Más antiguos', detalle: 'Los rescatados hace más tiempo arriba', icono: 'history' },
  { key: 'ultima_revision', titulo: 'Última revisión', detalle: 'Los que se tocaron o revisaron hace poco arriba', icono: 'update' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  orden: OrdenCasos;
  onOrden: (o: OrdenCasos) => void;
  estado: FiltroEstado;
  onEstado: (e: FiltroEstado) => void;
  estadosDisponibles: EstadoCaso[];
  onLimpiar: () => void;
};

/** Panel inferior para ordenar la bandeja y filtrarla por estado del caso. */
export function FiltrosCasosModal({
  visible,
  onClose,
  orden,
  onOrden,
  estado,
  onEstado,
  estadosDisponibles,
  onLimpiar,
}: Props) {
  const { bottom } = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.fondo} onPress={onClose} accessibilityLabel="Cerrar filtros" />
      <View style={[styles.hoja, { paddingBottom: bottom + 16 }]}>
        <View style={styles.asa} />
        <View style={styles.titulo}>
          <Text style={styles.tituloTexto}>Filtrar y ordenar</Text>
          <Pressable onPress={onLimpiar} hitSlop={8} accessibilityLabel="Limpiar filtros">
            <Text style={styles.limpiar}>Limpiar</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
          <View style={{ gap: 8 }}>
            <Text style={styles.seccion}>Ordenar por</Text>
            {ORDENES.map((o) => {
              const activo = orden === o.key;
              return (
                <Pressable
                  key={o.key}
                  style={[styles.opcion, activo && styles.opcionActiva]}
                  onPress={() => onOrden(o.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activo }}
                >
                  <MaterialIcons name={o.icono} size={22} color={activo ? colors.primary : colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.opcionTitulo, activo && { color: colors.primary }]}>{o.titulo}</Text>
                    <Text style={styles.opcionDetalle}>{o.detalle}</Text>
                  </View>
                  {activo && <MaterialIcons name="check-circle" size={22} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.seccion}>Estado del caso</Text>
            <View style={styles.chips}>
              {(['todos', ...estadosDisponibles] as FiltroEstado[]).map((e) => {
                const activo = estado === e;
                return (
                  <Pressable
                    key={e}
                    style={[styles.chip, activo && styles.chipActivo]}
                    onPress={() => onEstado(e)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: activo }}
                  >
                    <Text style={[styles.chipTexto, activo && { color: colors.onPrimary }]}>
                      {e === 'todos' ? 'Todos' : ETIQUETA_ESTADO[e]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <Pressable style={styles.aplicar} onPress={onClose}>
          <Text style={styles.aplicarTexto}>Ver casos</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  hoja: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: '80%',
    gap: 12,
  },
  asa: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border },
  titulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tituloTexto: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  limpiar: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
  seccion: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    minHeight: 56,
  },
  opcionActiva: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  opcionTitulo: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  opcionDetalle: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 40, paddingHorizontal: 16, borderRadius: 9999, backgroundColor: colors.surfaceChip, justifyContent: 'center' },
  chipActivo: { backgroundColor: colors.primary },
  chipTexto: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted },
  aplicar: { height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  aplicarTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.onPrimary },
});
