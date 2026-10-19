import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  BorradorRescate,
  EdadEstimada,
  ETIQUETA_EDAD,
  ETIQUETA_ESPECIE,
  ETIQUETA_TRIAJE,
  Especie,
  formatoFecha,
  Triaje,
} from '../../../domain/models/Rescate';
import { faltantesDelRescate } from '../../../domain/usecases/RegistrarRescate';
import { useUbicacion } from '../../hooks/useUbicacion';
import { colors, fonts } from '../../theme';
import { SegmentosPaso } from './BarraRescate';

type Props = {
  borrador: BorradorRescate;
  onCambio: (cambios: Partial<BorradorRescate>) => void;
  onVolverAFoto: () => void;
  onContinuar: () => void;
};

const ESPECIES: { key: Especie; emoji: string }[] = [
  { key: 'gato', emoji: '🐱' },
  { key: 'perro', emoji: '🐶' },
  { key: 'otro', emoji: '🐾' },
];
const EDADES: { key: EdadEstimada; emoji: string }[] = [
  { key: 'cachorro', emoji: '🍼' },
  { key: 'joven', emoji: '🦴' },
  { key: 'adulto', emoji: '🌿' },
  { key: 'senior', emoji: '👑' },
];
const TRIAJES: { key: Triaje; icono: keyof typeof MaterialIcons.glyphMap; color: string; fondo: string }[] = [
  { key: 'sano', icono: 'check-circle', color: colors.aldia, fondo: colors.aldiaBg },
  { key: 'desnutrido', icono: 'water-drop', color: colors.atencion, fondo: colors.atencionBg },
  { key: 'herida', icono: 'healing', color: colors.urgente, fondo: colors.urgenteBg },
  { key: 'urgente', icono: 'emergency', color: colors.urgente, fondo: colors.urgenteBg },
];

const DIA = 24 * 60 * 60 * 1000;

export function PasoDatos({ borrador: b, onCambio, onVolverAFoto, onContinuar }: Props) {
  const gps = useUbicacion();
  const [lugarTexto, setLugarTexto] = useState([b.barrio, b.lugar].filter(Boolean).join(', '));
  const [intento, setIntento] = useState(false);

  const fecha = new Date(b.fecha);
  const esHoy = Math.abs(Date.now() - fecha.getTime()) < DIA / 2;
  const faltan = faltantesDelRescate({ ...b, ...separarLugar(lugarTexto) });

  const cambiarLugar = (texto: string) => {
    setLugarTexto(texto);
    onCambio(separarLugar(texto));
  };

  const usarGps = async () => {
    const r = await gps.obtener();
    if (r) {
      cambiarLugar(r.texto);
      onCambio({ coordenadas: r.coordenadas });
    }
  };

  const alternarTriaje = (t: Triaje) =>
    onCambio({ triaje: b.triaje.includes(t) ? b.triaje.filter((x) => x !== t) : [...b.triaje, t] });

  // "Modificar" alterna entre hoy y ayer (sin librerías de calendario).
  const alternarFecha = () => onCambio({ fecha: new Date(Date.now() - (esHoy ? DIA : 0)).toISOString() });

  const continuar = () => {
    if (faltan.length) {
      setIntento(true);
      return;
    }
    onContinuar();
  };

  return (
    <View style={styles.root}>
      <View style={styles.stepper}>
        <View style={styles.stepperRow}>
          <Pressable style={styles.volver} onPress={onVolverAFoto}>
            <MaterialIcons name="arrow-back" size={18} color={colors.textMuted} />
            <Text style={styles.volverText}>Paso 1</Text>
          </Pressable>
          <Text style={styles.pasoActual}>Paso 2 de 3</Text>
          <Text style={styles.pasoSub}>Datos</Text>
        </View>
        <SegmentosPaso paso={2} />
      </View>

      <View style={styles.card}>
        <View style={styles.fotoRow}>
          {b.fotoUri ? (
            <Image source={{ uri: b.fotoUri }} style={styles.foto} />
          ) : (
            <View style={[styles.foto, styles.fotoVacia]}>
              <MaterialIcons name="no-photography" size={28} color={colors.textSubtle} />
            </View>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <View style={[styles.badgeFoto, !b.fotoUri && { backgroundColor: colors.surfaceChip }]}>
              <Text style={[styles.badgeFotoText, !b.fotoUri && { color: colors.textMuted }]}>
                {b.fotoUri ? 'Foto capturada' : 'Sin foto'}
              </Text>
              <MaterialIcons name={b.fotoUri ? 'photo-camera' : 'fast-forward'} size={13} color={b.fotoUri ? colors.aldiaText : colors.textMuted} />
            </View>
            <Text style={styles.fotoDesc}>{b.fotoUri ? 'Imagen adjunta al registro' : 'Omitida por urgencia'}</Text>
            <Pressable style={styles.cambiarFoto} onPress={onVolverAFoto}>
              <MaterialIcons name="edit" size={14} color={colors.primary} />
              <Text style={styles.cambiarFotoText}>{b.fotoUri ? 'Cambiar foto' : 'Agregar foto'}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.tituloRow}>
          <Text style={styles.titulo}>Nombre o apodo provisorio</Text>
          <Text style={styles.opcional}>Recomendado</Text>
        </View>
        <Text style={styles.ayuda}>Poné un apodo cariñoso o el código del sector para ubicarlo rápido.</Text>
        <View style={styles.campo}>
          <MaterialIcons name="badge" size={20} color={colors.textSubtle} />
          <TextInput
            style={styles.input}
            value={b.nombre}
            onChangeText={(nombre) => onCambio({ nombre })}
            placeholder="Ej: Bigote Rayado"
            placeholderTextColor={colors.placeholderInput}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={[styles.titulo, intento && !b.especie && styles.error]}>Especie rescatada</Text>
        <View style={styles.chips}>
          {ESPECIES.map((e) => (
            <Chip key={e.key} activo={b.especie === e.key} onPress={() => onCambio({ especie: e.key })}>
              {e.emoji}  {ETIQUETA_ESPECIE[e.key]}
            </Chip>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.tituloRow}>
          <Text style={[styles.titulo, intento && !b.edad && styles.error]}>Edad estimada</Text>
          <Text style={styles.opcional}>A ojo de campo</Text>
        </View>
        <View style={styles.chips}>
          {EDADES.map((e) => (
            <Chip key={e.key} activo={b.edad === e.key} onPress={() => onCambio({ edad: e.key })}>
              {e.emoji} {ETIQUETA_EDAD[e.key]}
            </Chip>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.tituloRow}>
          <Text style={styles.titulo}>Estado visible / Triaje rápido</Text>
          <View style={styles.sanidad}>
            <MaterialIcons name="health-and-safety" size={14} color={colors.atencion} />
            <Text style={styles.sanidadText}>Sanidad</Text>
          </View>
        </View>
        <View style={styles.chips}>
          {TRIAJES.map((t) => {
            const activo = b.triaje.includes(t.key);
            return (
              <Pressable
                key={t.key}
                onPress={() => alternarTriaje(t.key)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: activo }}
                style={[styles.chipTriaje, activo && { backgroundColor: t.fondo, borderColor: t.color }]}
              >
                <MaterialIcons name={t.icono} size={18} color={t.color} />
                <Text style={[styles.chipTriajeText, activo && { color: t.color }]}>{ETIQUETA_TRIAJE[t.key]}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.notas}>
          <Text style={styles.notasLabel}>Notas de campo / Observaciones adicionales</Text>
          <TextInput
            style={styles.notasInput}
            value={b.notas}
            onChangeText={(notas) => onCambio({ notas })}
            multiline
            textAlignVertical="top"
            placeholder="Ej: Con buen ánimo, un poco asustado y bajo peso. Sin pulgas visibles."
            placeholderTextColor={colors.placeholderInput}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.titulo}>Fecha del rescate</Text>
        <View style={styles.campo}>
          <MaterialIcons name="event" size={20} color={colors.primary} />
          <Text style={[styles.input, styles.fechaText]}>
            {esHoy ? 'Hoy' : 'Ayer'} ({formatoFecha(fecha)})
          </Text>
          <Pressable onPress={alternarFecha} hitSlop={8}>
            <Text style={styles.link}>Modificar</Text>
          </Pressable>
        </View>

        <View style={[styles.tituloRow, { marginTop: 4 }]}>
          <Text style={[styles.titulo, intento && !lugarTexto.trim() && styles.error]}>Lugar / Barrio del rescate</Text>
          <Pressable style={styles.gps} onPress={usarGps} hitSlop={8}>
            <MaterialIcons name="my-location" size={14} color={colors.primary} />
            <Text style={styles.link}>
              {gps.estado === 'buscando' ? 'Buscando…' : gps.estado === 'activo' ? 'GPS Activo' : 'Usar mi ubicación'}
            </Text>
          </Pressable>
        </View>
        <View style={styles.campo}>
          <MaterialIcons name="location-on" size={20} color={colors.textSubtle} />
          <TextInput
            style={styles.input}
            value={lugarTexto}
            onChangeText={cambiarLugar}
            placeholder="Barrio, calle o referencia"
            placeholderTextColor={colors.placeholderInput}
          />
        </View>
        {(gps.estado === 'denegado' || gps.estado === 'error') && (
          <Text style={styles.avisoGps}>
            {gps.estado === 'denegado'
              ? 'Sin permiso de ubicación. Podés escribir el lugar a mano.'
              : 'No pudimos leer el GPS. Escribí el lugar a mano.'}
          </Text>
        )}
      </View>

      <View style={styles.red}>
        <View style={styles.redIcono}>
          <MaterialIcons name="volunteer-activism" size={20} color={colors.atencionText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.redTitulo}>Red PERF lista para derivar</Text>
          <Text style={styles.redTexto}>En el próximo paso asignás hogar de tránsito o veterinaria de guardia.</Text>
        </View>
      </View>

      {intento && faltan.length > 0 && <Text style={styles.avisoFalta}>Falta completar {faltan.join(', ')}.</Text>}

      <Pressable style={[styles.cta, faltan.length > 0 && styles.ctaGris]} onPress={continuar}>
        <Text style={styles.ctaText}>Continuar al paso 3</Text>
        <MaterialIcons name="arrow-forward" size={20} color="#fff" />
      </Pressable>
    </View>
  );
}

// "Balvanera, Plaza Miserere" -> barrio y lugar
function separarLugar(texto: string): Pick<BorradorRescate, 'barrio' | 'lugar'> {
  const [barrio, ...resto] = texto.split(',');
  return { barrio: (barrio ?? '').trim(), lugar: resto.join(',').trim() };
}

function Chip({ activo, onPress, children }: { activo: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: activo }}
      style={[styles.chip, activo && styles.chipActivo]}
    >
      <Text style={[styles.chipText, activo && { color: colors.onPrimary }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12, paddingHorizontal: 16, paddingTop: 4 },
  stepper: { gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.surfaceCard },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  volverText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted },
  pasoActual: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  pasoSub: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted },

  card: { gap: 10, padding: 16, borderRadius: 16, backgroundColor: colors.surface },
  fotoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  foto: { width: 80, height: 80, borderRadius: 12 },
  fotoVacia: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  badgeFoto: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.toastIcon },
  badgeFotoText: { fontFamily: fonts.bold, fontSize: 13, color: colors.aldiaText },
  fotoDesc: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  cambiarFoto: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cambiarFotoText: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },

  tituloRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  titulo: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  error: { color: colors.urgente },
  opcional: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSubtle },
  ayuda: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  campo: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.surfaceCard },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.text, paddingVertical: 10 },
  fechaText: { fontFamily: fonts.semibold },
  link: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  gps: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  avisoGps: { fontFamily: fonts.regular, fontSize: 13, color: colors.urgente },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9999, backgroundColor: colors.surfaceChip },
  chipActivo: { backgroundColor: colors.primary },
  chipText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },

  sanidad: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sanidadText: { fontFamily: fonts.bold, fontSize: 14, color: colors.atencion },
  chipTriaje: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9999, borderWidth: 1.5, borderColor: 'transparent', backgroundColor: colors.surfaceChip },
  chipTriajeText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  notas: { gap: 4, padding: 14, borderRadius: 12, backgroundColor: colors.surfaceCard },
  notasLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted },
  notasInput: { minHeight: 64, padding: 0, fontFamily: fonts.regular, fontSize: 16, color: colors.text },

  red: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.surfaceMuted },
  redIcono: { width: 40, height: 40, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.atencionBg },
  redTitulo: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  redTexto: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },

  avisoFalta: { fontFamily: fonts.semibold, fontSize: 14, color: colors.urgente, textAlign: 'center' },
  cta: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 9999, backgroundColor: colors.primary },
  ctaGris: { opacity: 0.55 },
  ctaText: { fontFamily: fonts.semibold, fontSize: 17, color: '#fff' },
});
