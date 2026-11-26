import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts } from '../theme';

const DIA_MS = 24 * 60 * 60 * 1000;

export function mediodiaLocal(fecha: Date = new Date()): number {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 12, 0, 0, 0).getTime();
}

export function timestampAInputFecha(ts: number): string {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatearInputFecha(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

export function parsearFechaExacta(texto: string): number | null {
  const m = texto.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const anio = Number(m[3]);
  if (anio < 2000 || anio > 2100 || mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const d = new Date(anio, mes - 1, dia, 12, 0, 0, 0);
  if (d.getFullYear() !== anio || d.getMonth() !== mes - 1 || d.getDate() !== dia) {
    return null;
  }
  return d.getTime();
}

function formatoLargoFecha(ts: number): string {
  return new Date(ts).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

type DosisProps = {
  titulo: string;
  subPendiente: string;
  fecha: number | null | undefined;
  onChangeFecha: (ts: number | null) => void;
  onValidityChange?: (valido: boolean) => void;
  fechaReferencia?: number | null;
};

function FilaDesparasitacion({
  titulo,
  subPendiente,
  fecha,
  onChangeFecha,
  onValidityChange,
  fechaReferencia,
}: DosisProps) {
  const activa = fecha != null;
  const [texto, setTexto] = useState(fecha ? timestampAInputFecha(fecha) : '');

  useEffect(() => {
    if (fecha != null) {
      const formateada = timestampAInputFecha(fecha);
      setTexto((prev) => (parsearFechaExacta(prev) === mediodiaLocal(new Date(fecha)) ? prev : formateada));
      onValidityChange?.(true);
    } else {
      setTexto('');
      onValidityChange?.(true);
    }
  }, [fecha, onValidityChange]);

  const parsedActual = parsearFechaExacta(texto);
  const textoInvalido = activa && parsedActual === null;

  const toggleAplicada = () => {
    if (activa) {
      setTexto('');
      onChangeFecha(null);
      onValidityChange?.(true);
    } else {
      const hoy = mediodiaLocal();
      setTexto(timestampAInputFecha(hoy));
      onChangeFecha(hoy);
      onValidityChange?.(true);
    }
  };

  const handleTexto = (raw: string) => {
    const formateado = formatearInputFecha(raw);
    setTexto(formateado);
    const parsed = parsearFechaExacta(formateado);
    if (parsed !== null) {
      onChangeFecha(parsed);
      onValidityChange?.(true);
    } else {
      onValidityChange?.(false);
    }
  };

  const fijarTimestamp = (ts: number) => {
    const norm = mediodiaLocal(new Date(ts));
    setTexto(timestampAInputFecha(norm));
    onChangeFecha(norm);
    onValidityChange?.(true);
  };

  return (
    <View style={styles.dosisWrap}>
      <Pressable style={styles.toggleRow} onPress={toggleAplicada} accessibilityRole="checkbox" accessibilityState={{ checked: activa }}>
        <View style={[styles.checkbox, activa && styles.checkboxActivo]}>
          {activa && <MaterialIcons name="check" size={16} color={colors.onPrimary} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleTitulo}>{titulo}</Text>
          <Text style={styles.toggleSub}>
            {activa && parsedActual !== null
              ? `Aplicada el ${formatoLargoFecha(parsedActual)}`
              : activa
              ? 'Completá la fecha exacta de aplicación'
              : subPendiente}
          </Text>
        </View>
      </Pressable>

      {activa && (
        <View style={styles.fechaBox}>
          <View style={styles.fechaLabelRow}>
            <Text style={styles.fechaLabel}>Fecha exacta (DD/MM/AAAA)</Text>
            {parsedActual !== null && (
              <Text style={styles.fechaPreview}>{formatoLargoFecha(parsedActual)}</Text>
            )}
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputWrap}>
              <MaterialIcons name="calendar-today" size={18} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.fechaInput, textoInvalido && styles.fechaInputError]}
                value={texto}
                onChangeText={handleTexto}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={colors.placeholderInput}
                keyboardType="number-pad"
                maxLength={10}
                accessibilityLabel={`Fecha de ${titulo}`}
              />
            </View>
            <Pressable
              style={styles.stepBtn}
              onPress={() => fijarTimestamp((parsedActual ?? mediodiaLocal()) - DIA_MS)}
              accessibilityLabel="Restar un día"
            >
              <MaterialIcons name="remove" size={18} color={colors.text} />
            </Pressable>
            <Pressable
              style={styles.stepBtn}
              onPress={() => fijarTimestamp((parsedActual ?? mediodiaLocal()) + DIA_MS)}
              accessibilityLabel="Sumar un día"
            >
              <MaterialIcons name="add" size={18} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.atajosRow}>
            <Pressable style={styles.atajoChip} onPress={() => fijarTimestamp(mediodiaLocal())}>
              <Text style={styles.atajoText}>Hoy</Text>
            </Pressable>
            <Pressable style={styles.atajoChip} onPress={() => fijarTimestamp(mediodiaLocal() - DIA_MS)}>
              <Text style={styles.atajoText}>Ayer</Text>
            </Pressable>
            {fechaReferencia != null && (
              <Pressable
                style={styles.atajoChip}
                onPress={() => fijarTimestamp(fechaReferencia + 15 * DIA_MS)}
              >
                <Text style={styles.atajoText}>+15 días de la 1°</Text>
              </Pressable>
            )}
          </View>

          {textoInvalido && (
            <Text style={styles.errorText}>
              Ingresá una fecha válida (DD/MM/AAAA, ej: {timestampAInputFecha(mediodiaLocal())}).
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

type CardProps = {
  fechaPrimera: number | null | undefined;
  fechaSegunda: number | null | undefined;
  onChangePrimera: (ts: number | null) => void;
  onChangeSegunda: (ts: number | null) => void;
  onValidityChange?: (todoValido: boolean) => void;
  titulo?: string;
  descripcion?: string;
};

export function PlanDesparasitacionCard({
  fechaPrimera,
  fechaSegunda,
  onChangePrimera,
  onChangeSegunda,
  onValidityChange,
  titulo = 'Plan de Desparasitación',
  descripcion = 'Indicá si fue aplicada y la fecha exacta de cada dosis (DD/MM/AAAA).',
}: CardProps) {
  const [valida1, setValida1] = useState(true);
  const [valida2, setValida2] = useState(true);

  useEffect(() => {
    onValidityChange?.(valida1 && valida2);
  }, [valida1, valida2, onValidityChange]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MaterialIcons name="medication" size={20} color={colors.primary} />
        <Text style={styles.titulo}>{titulo}</Text>
      </View>
      <Text style={styles.desc}>{descripcion}</Text>

      <View style={styles.despCard}>
        <FilaDesparasitacion
          titulo="1° Desparasitación"
          subPendiente="Pendiente de suministro en tránsito o clínica"
          fecha={fechaPrimera}
          onChangeFecha={onChangePrimera}
          onValidityChange={setValida1}
        />

        <View style={styles.divider} />

        <FilaDesparasitacion
          titulo="2° Desparasitación (Refuerzo a los 15 días)"
          subPendiente="Pendiente para cortar ciclo larvario"
          fecha={fechaSegunda}
          onChangeFecha={onChangeSegunda}
          onValidityChange={setValida2}
          fechaReferencia={fechaPrimera ?? null}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titulo: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  desc: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  despCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 6,
    marginTop: 4,
  },
  dosisWrap: {
    paddingBottom: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    minHeight: 52,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleTitulo: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  toggleSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 12 },

  fechaBox: {
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  fechaLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  fechaLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textSubtle,
  },
  fechaPreview: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.primary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  fechaInput: {
    height: 44,
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 38,
    paddingRight: 12,
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  fechaInputError: {
    borderColor: colors.urgente,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.surfaceChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atajosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  atajoChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    backgroundColor: colors.primarySoft,
  },
  atajoText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primary,
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.urgente,
  },
});
