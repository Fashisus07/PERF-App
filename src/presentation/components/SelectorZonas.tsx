import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ZONAS_DISPONIBLES } from '../../domain/models/Ajustes';
import { colors, fonts } from '../theme';

type Props = {
  value: string[];
  onChange: (zonas: string[]) => void;
};

/** Elegir una o varias zonas que cubre el voluntario, y sumar otras que no estén en la lista. */
export function SelectorZonas({ value, onChange }: Props) {
  const [otra, setOtra] = useState('');
  const conocidas = new Set<string>(ZONAS_DISPONIBLES);
  const propias = value.filter((z) => !conocidas.has(z));
  const opciones = [...ZONAS_DISPONIBLES, ...propias];

  const alternar = (zona: string) =>
    onChange(value.includes(zona) ? value.filter((z) => z !== zona) : [...value, zona]);

  const agregarOtra = () => {
    const limpia = otra.replace(/,/g, ' ').trim();
    if (!limpia) return;
    if (!value.some((z) => z.toLowerCase() === limpia.toLowerCase())) onChange([...value, limpia]);
    setOtra('');
  };

  return (
    <View style={styles.root}>
      <View style={styles.chips}>
        {opciones.map((zona) => {
          const activa = value.includes(zona);
          return (
            <Pressable
              key={zona}
              style={[styles.chip, activa && styles.chipActive]}
              onPress={() => alternar(zona)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: activa }}
            >
              <MaterialIcons
                name={activa ? 'check' : 'location-on'}
                size={14}
                color={activa ? colors.onPrimary : colors.textMuted}
              />
              <Text style={[styles.chipText, activa && { color: colors.onPrimary }]}>{zona}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.otraRow}>
        <TextInput
          style={styles.otraInput}
          value={otra}
          onChangeText={setOtra}
          onSubmitEditing={agregarOtra}
          placeholder="Otra zona o barrio..."
          placeholderTextColor={colors.placeholderField}
          returnKeyType="done"
        />
        <Pressable
          style={[styles.otraBoton, !otra.trim() && { opacity: 0.5 }]}
          onPress={agregarOtra}
          disabled={!otra.trim()}
          accessibilityLabel="Agregar zona"
        >
          <MaterialIcons name="add" size={22} color={colors.onPrimary} />
        </Pressable>
      </View>

      <Text style={styles.resumen}>
        {value.length === 0
          ? 'Elegí al menos una zona.'
          : `${value.length} ${value.length === 1 ? 'zona elegida' : 'zonas elegidas'}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 2 },
  chip: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 9999,
    backgroundColor: colors.surfaceChip,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, letterSpacing: 0.28, color: colors.textMuted },
  otraRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  otraInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  otraBoton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumen: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, paddingLeft: 4 },
});
