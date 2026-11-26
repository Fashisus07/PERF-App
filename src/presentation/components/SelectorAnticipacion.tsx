import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ETIQUETA_UNIDAD, LIMITE_UNIDAD, PASO_UNIDAD, UNIDADES_RECORDATORIO, UnidadRecordatorio } from '../../domain/models/Turno';
import { colors, fonts } from '../theme';

type Props = {
  valor: number;
  unidad: UnidadRecordatorio;
  onCambiarValor: (valor: number) => void;
  onCambiarUnidad: (unidad: UnidadRecordatorio) => void;
};

// Selector libre de anticipación: +/- para el número, chips para la unidad (minutos/horas/días).
export function SelectorAnticipacion({ valor, unidad, onCambiarValor, onCambiarUnidad }: Props) {
  const limite = LIMITE_UNIDAD[unidad];
  const paso = PASO_UNIDAD[unidad];
  const etiquetaValor = valor === 1 ? ETIQUETA_UNIDAD[unidad].singular : ETIQUETA_UNIDAD[unidad].plural;

  return (
    <View style={styles.contenedor}>
      <View style={styles.stepper}>
        <Pressable
          style={[styles.stepBtn, valor <= limite.min && { opacity: 0.4 }]}
          onPress={() => onCambiarValor(Math.max(limite.min, valor - paso))}
          disabled={valor <= limite.min}
          accessibilityLabel="Reducir anticipación"
        >
          <MaterialIcons name="remove" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.valor}>
          <Text style={styles.valorNumero}>{valor}</Text>
          <Text style={styles.valorUnidad}>{etiquetaValor.toUpperCase()}</Text>
        </View>
        <Pressable
          style={[styles.stepBtn, valor >= limite.max && { opacity: 0.4 }]}
          onPress={() => onCambiarValor(Math.min(limite.max, valor + paso))}
          disabled={valor >= limite.max}
          accessibilityLabel="Aumentar anticipación"
        >
          <MaterialIcons name="add" size={24} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.unidades}>
        {UNIDADES_RECORDATORIO.map((u) => {
          const activa = unidad === u;
          return (
            <Pressable
              key={u}
              style={[styles.unidadChip, activa && styles.unidadChipActiva]}
              onPress={() => onCambiarUnidad(u)}
              accessibilityRole="radio"
              accessibilityState={{ checked: activa }}
            >
              <Text style={[styles.unidadChipText, activa && { color: '#fff' }]}>{ETIQUETA_UNIDAD[u].plural}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, backgroundColor: colors.surfaceCard },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  stepBtn: { width: 48, height: 48, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceChip },
  valor: { alignItems: 'center', minWidth: 90 },
  valorNumero: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 38, color: colors.primary },
  valorUnidad: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.6, color: colors.textMuted },
  unidades: { flexDirection: 'row', gap: 8 },
  unidadChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999, backgroundColor: colors.surfaceChip },
  unidadChipActiva: { backgroundColor: colors.primary },
  unidadChipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
});
