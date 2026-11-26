import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Caso,
  ETIQUETA_RELACION,
  TIPOS_RELACION_LISTA,
  TipoRelacionAnimal,
  especieLegible,
} from '../../domain/models/Caso';
import { colors, fonts } from '../theme';

export interface RelacionEditable {
  id?: string;
  tipoRelacion: TipoRelacionAnimal;
  casoDestinoId?: string | null;
  nombreDestino: string;
}

type Props = {
  relaciones: RelacionEditable[];
  casosDisponibles: Caso[];
  casoActualId?: string;
  onAgregar: (rel: RelacionEditable) => void;
  onQuitar: (index: number) => void;
};

/** Selector de vínculos familiares o de camada (ej: Hijo de Mora, Hermana de Lolo). */
export function SelectorRelacionesAnimal({
  relaciones,
  casosDisponibles,
  casoActualId,
  onAgregar,
  onQuitar,
}: Props) {
  const [tipo, setTipo] = useState<TipoRelacionAnimal>('HIJO_DE');
  const [busqueda, setBusqueda] = useState('');

  const candidatos = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return casosDisponibles
      .filter((c) => c.id !== casoActualId)
      .filter((c) => !q || c.nombreProvisorio.toLowerCase().includes(q))
      .slice(0, 8);
  }, [casosDisponibles, casoActualId, busqueda]);

  const yaExiste = (nombre: string, destId?: string | null) =>
    relaciones.some(
      (r) =>
        r.tipoRelacion === tipo &&
        ((destId && r.casoDestinoId === destId) ||
          r.nombreDestino.trim().toLowerCase() === nombre.trim().toLowerCase())
    );

  const agregarManual = () => {
    const limpio = busqueda.trim();
    if (!limpio) return;
    const match = casosDisponibles.find(
      (c) =>
        c.id !== casoActualId &&
        c.nombreProvisorio.trim().toLowerCase() === limpio.toLowerCase()
    );
    if (!yaExiste(limpio, match?.id)) {
      onAgregar({
        tipoRelacion: tipo,
        casoDestinoId: match?.id ?? null,
        nombreDestino: match ? match.nombreProvisorio : limpio,
      });
    }
    setBusqueda('');
  };

  const agregarDesdeCaso = (c: Caso) => {
    if (!yaExiste(c.nombreProvisorio, c.id)) {
      onAgregar({
        tipoRelacion: tipo,
        casoDestinoId: c.id,
        nombreDestino: c.nombreProvisorio,
      });
    }
    setBusqueda('');
  };

  return (
    <View style={styles.wrap}>
      {relaciones.length > 0 && (
        <View style={styles.listaActiva}>
          {relaciones.map((r, idx) => (
            <View key={`${r.tipoRelacion}-${r.casoDestinoId ?? r.nombreDestino}-${idx}`} style={styles.badge}>
              <MaterialIcons name="family-restroom" size={15} color={colors.primary} />
              <Text style={styles.badgeText}>
                {ETIQUETA_RELACION[r.tipoRelacion]} {r.nombreDestino}
              </Text>
              <Pressable onPress={() => onQuitar(idx)} hitSlop={8} accessibilityLabel="Quitar vínculo">
                <MaterialIcons name="close" size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.subLabel}>1. Elegí el tipo de vínculo</Text>
      <View style={styles.chipsRow}>
        {TIPOS_RELACION_LISTA.map((t) => {
          const activo = tipo === t;
          return (
            <Pressable
              key={t}
              style={[styles.chip, activo && styles.chipActivo]}
              onPress={() => setTipo(t)}
            >
              <Text style={[styles.chipText, activo && styles.chipTextActivo]}>
                {ETIQUETA_RELACION[t]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.subLabel}>2. Elegí el otro animal o escribí su nombre</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Ej: Mora, Bimba, Coco..."
          placeholderTextColor={colors.placeholder}
          onSubmitEditing={agregarManual}
        />
        <Pressable
          style={[styles.btnAgregar, !busqueda.trim() && styles.btnDeshabilitado]}
          onPress={agregarManual}
          disabled={!busqueda.trim()}
        >
          <MaterialIcons name="add" size={18} color={colors.onPrimary} />
          <Text style={styles.btnAgregarText}>Agregar</Text>
        </Pressable>
      </View>

      {candidatos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.candidatosRow}>
          {candidatos.map((c) => (
            <Pressable key={c.id} style={styles.candidatoChip} onPress={() => agregarDesdeCaso(c)}>
              <MaterialIcons name="add-link" size={14} color={colors.primary} />
              <Text style={styles.candidatoText}>
                {c.nombreProvisorio} ({especieLegible(c)})
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  listaActiva: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  badgeText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  subLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.surfaceChip,
  },
  chipActivo: { backgroundColor: colors.primary },
  chipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted },
  chipTextActivo: { color: colors.onPrimary },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: 44,
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  btnAgregar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
  },
  btnDeshabilitado: { opacity: 0.45 },
  btnAgregarText: { fontFamily: fonts.bold, fontSize: 13, color: colors.onPrimary },
  candidatosRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  candidatoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  candidatoText: { fontFamily: fonts.medium, fontSize: 12, color: colors.text },
});
