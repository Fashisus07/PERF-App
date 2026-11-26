import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts } from '../theme';

export const ZONAS_BASE = ['Balvanera', 'Caballito', 'Almagro', 'Palermo', 'San Telmo'] as const;

const CLAVE_PREFIJO = '@perf_zonas_custom:';

export function parsearZonas(zonaTexto?: string): string[] {
  if (!zonaTexto) return [];
  const vistas = new Set<string>();
  const resultado: string[] = [];
  for (const parte of zonaTexto.split(',')) {
    const limpia = parte.trim();
    if (!limpia) continue;
    const key = limpia.toLowerCase();
    if (vistas.has(key)) continue;
    vistas.add(key);
    resultado.push(limpia);
  }
  return resultado;
}

export function serializarZonas(zonas: string[]): string {
  return zonas.map((z) => z.trim()).filter(Boolean).join(', ');
}

export async function guardarZonasCustomUsuario(claveUsuario: string | undefined, zonas: string[]): Promise<void> {
  if (!claveUsuario) return;
  const baseLower = new Set(ZONAS_BASE.map((z) => z.toLowerCase()));
  const custom = zonas.filter((z) => !baseLower.has(z.toLowerCase()));
  if (custom.length === 0) return;
  try {
    const key = `${CLAVE_PREFIJO}${claveUsuario.trim().toLowerCase()}`;
    const previoRaw = await AsyncStorage.getItem(key);
    const prev: string[] = previoRaw ? JSON.parse(previoRaw) : [];
    const merged: string[] = [...prev];
    const vistas = new Set(merged.map((m) => m.toLowerCase()));
    for (const z of custom) {
      if (!vistas.has(z.toLowerCase())) {
        vistas.add(z.toLowerCase());
        merged.push(z);
      }
    }
    await AsyncStorage.setItem(key, JSON.stringify(merged));
  } catch {}
}

type Props = {
  zonasSeleccionadas: string[];
  onChange: (zonas: string[]) => void;
  titulo?: string;
  subtitulo?: string;
  storageKey?: string;
  error?: string;
};

export function SelectorZonas({
  zonasSeleccionadas,
  onChange,
  titulo = 'Zonas habituales de acción',
  subtitulo = 'Podés elegir más de una',
  storageKey,
  error,
}: Props) {
  const [customZonas, setCustomZonas] = useState<string[]>([]);
  const [mostrarOtra, setMostrarOtra] = useState(false);
  const [nuevaZona, setNuevaZona] = useState('');

  // Cargar zonas personalizadas guardadas localmente para este usuario
  useEffect(() => {
    if (!storageKey) return;
    const key = `${CLAVE_PREFIJO}${storageKey.trim().toLowerCase()}`;
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (!raw) return;
        const parsed: string[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomZonas((prev) => {
            const vistas = new Set([...ZONAS_BASE, ...prev].map((z) => z.toLowerCase()));
            const nuevas = parsed.filter((p) => p && !vistas.has(p.toLowerCase()));
            return nuevas.length > 0 ? [...prev, ...nuevas] : prev;
          });
        }
      })
      .catch(() => {});
  }, [storageKey]);

  // Asegurar que cualquier zona ya presente en zonasSeleccionadas (ej. al cargar perfil) tenga su botón
  useEffect(() => {
    setCustomZonas((prev) => {
      const vistas = new Set([...ZONAS_BASE, ...prev].map((z) => z.toLowerCase()));
      const faltantes = zonasSeleccionadas.filter((z) => z.trim() && !vistas.has(z.trim().toLowerCase()));
      return faltantes.length > 0 ? [...prev, ...faltantes] : prev;
    });
  }, [zonasSeleccionadas]);

  const todasLasZonas = [...ZONAS_BASE, ...customZonas];

  const toggleZona = (nombre: string) => {
    const lower = nombre.toLowerCase();
    const yaEsta = zonasSeleccionadas.some((z) => z.toLowerCase() === lower);
    if (yaEsta) {
      onChange(zonasSeleccionadas.filter((z) => z.toLowerCase() !== lower));
    } else {
      onChange([...zonasSeleccionadas, nombre]);
    }
  };

  const agregarOtraZona = async () => {
    const limpia = nuevaZona.trim().replace(/,+$/, '').trim();
    if (!limpia) return;

    const existente = todasLasZonas.find((z) => z.toLowerCase() === limpia.toLowerCase());
    if (existente) {
      if (!zonasSeleccionadas.some((z) => z.toLowerCase() === existente.toLowerCase())) {
        onChange([...zonasSeleccionadas, existente]);
      }
      setNuevaZona('');
      setMostrarOtra(false);
      return;
    }

    const actualizadasCustom = [...customZonas, limpia];
    setCustomZonas(actualizadasCustom);
    onChange([...zonasSeleccionadas, limpia]);
    setNuevaZona('');
    setMostrarOtra(false);

    if (storageKey) {
      await guardarZonasCustomUsuario(storageKey, actualizadasCustom);
    }
  };

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{titulo}</Text>
        <Text style={styles.nota}>{subtitulo}</Text>
      </View>

      <View style={styles.chips}>
        {todasLasZonas.map((nombre) => {
          const activa = zonasSeleccionadas.some((z) => z.toLowerCase() === nombre.toLowerCase());
          return (
            <Pressable
              key={nombre}
              style={[styles.chip, activa && styles.chipActive]}
              onPress={() => toggleZona(nombre)}
              accessibilityRole="button"
              accessibilityState={{ selected: activa }}
            >
              <MaterialIcons
                name={activa ? 'check-circle' : 'location-on'}
                size={15}
                color={activa ? colors.onPrimary : colors.textMuted}
              />
              <Text style={[styles.chipText, activa && styles.chipTextActive]}>{nombre}</Text>
            </Pressable>
          );
        })}

        <Pressable
          style={[styles.chip, styles.chipOtra, mostrarOtra && styles.chipActive]}
          onPress={() => setMostrarOtra((m) => !m)}
          accessibilityRole="button"
          accessibilityLabel="Agregar otra zona"
        >
          <MaterialIcons
            name={mostrarOtra ? 'close' : 'near-me'}
            size={15}
            color={mostrarOtra ? colors.onPrimary : colors.primary}
          />
          <Text style={[styles.chipText, { color: colors.primary }, mostrarOtra && styles.chipTextActive]}>
            Otra zona
          </Text>
        </Pressable>
      </View>

      {mostrarOtra && (
        <View style={styles.otraBox}>
          <TextInput
            style={styles.otraInput}
            value={nuevaZona}
            onChangeText={setNuevaZona}
            placeholder="Escribí tu zona o barrio (ej: Flores)"
            placeholderTextColor={colors.placeholderInput}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={agregarOtraZona}
          />
          <Pressable
            style={[styles.btnAgregar, !nuevaZona.trim() && styles.btnAgregarDisabled]}
            onPress={agregarOtraZona}
            disabled={!nuevaZona.trim()}
            accessibilityLabel="Confirmar nueva zona"
          >
            <MaterialIcons name="add" size={18} color={colors.onPrimary} />
            <Text style={styles.btnAgregarText}>Agregar</Text>
          </Pressable>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, color: colors.text },
  nota: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 2 },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: colors.surfaceChip,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipOtra: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  chipText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.onPrimary,
  },
  otraBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  otraInput: {
    flex: 1,
    height: 48,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  btnAgregar: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  btnAgregarDisabled: {
    opacity: 0.45,
  },
  btnAgregarText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.onPrimary,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.urgente,
    paddingLeft: 4,
  },
});
