import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../theme';
import { SegmentosPaso } from './BarraRescate';

type Props = { onFoto: (uri: string) => void; onOmitir: () => void };

type Flash = 'auto' | 'on' | 'off';
const FLASH: Record<Flash, { label: string; icono: keyof typeof MaterialIcons.glyphMap }> = {
  auto: { label: 'Auto', icono: 'flash-auto' },
  on: { label: 'Encendido', icono: 'flash-on' },
  off: { label: 'Apagado', icono: 'flash-off' },
};
const SIGUIENTE_FLASH: Record<Flash, Flash> = { auto: 'on', on: 'off', off: 'auto' };

export function PasoFoto({ onFoto, onOmitir }: Props) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const camara = useRef<CameraView>(null);
  const [frontal, setFrontal] = useState(false);
  const [flash, setFlash] = useState<Flash>('auto');
  const [lista, setLista] = useState(false);
  const [sacando, setSacando] = useState(false);
  const [avisoAudio, setAvisoAudio] = useState(false);

  const sacarFoto = async () => {
    if (!camara.current || !lista || sacando) return;
    setSacando(true);
    try {
      const foto = await camara.current.takePictureAsync({ quality: 0.7 });
      if (foto?.uri) onFoto(foto.uri);
    } finally {
      setSacando(false);
    }
  };

  const abrirGaleria = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!r.canceled && r.assets[0]) onFoto(r.assets[0].uri);
  };

  return (
    <View style={styles.root}>
      <View style={styles.progresoRow}>
        <View style={styles.pasoLabel}>
          <MaterialIcons name="pets" size={16} color={colors.primary} />
          <Text style={styles.pasoText}>Paso 1 de 3</Text>
        </View>
        <Text style={styles.pasoSub}>Foto del animal</Text>
      </View>
      <SegmentosPaso paso={1} />

      <View style={styles.tip}>
        <MaterialIcons name="tips-and-updates" size={20} color={colors.atencion} />
        <Text style={styles.tipText}>
          Sacale una foto nítida de cuerpo entero o cara para identificarlo rápido en guardia.
        </Text>
      </View>

      <View style={styles.visor}>
        {permiso?.granted ? (
          <>
            <CameraView
              ref={camara}
              style={StyleSheet.absoluteFill}
              facing={frontal ? 'front' : 'back'}
              flash={flash}
              onCameraReady={() => setLista(true)}
            />
            {/* Guía de encuadre: grilla de tercios y círculo de enfoque */}
            <View style={styles.grilla} pointerEvents="none">
              <View style={[styles.lineaV, { left: '33.3%' }]} />
              <View style={[styles.lineaV, { left: '66.6%' }]} />
              <View style={[styles.lineaH, { top: '33.3%' }]} />
              <View style={[styles.lineaH, { top: '66.6%' }]} />
              <View style={styles.enfoque}>
                <View style={styles.enfoquePunto} />
              </View>
            </View>
            <Pressable style={styles.flash} onPress={() => setFlash(SIGUIENTE_FLASH[flash])} accessibilityLabel="Flash">
              <MaterialIcons name={FLASH[flash].icono} size={18} color="#fff" />
              <Text style={styles.flashText}>{FLASH[flash].label}</Text>
            </Pressable>
            <Pressable style={styles.voltear} onPress={() => setFrontal((f) => !f)} accessibilityLabel="Cambiar cámara">
              <MaterialIcons name="flip-camera-android" size={20} color="#fff" />
            </Pressable>
            <View style={styles.asistido} pointerEvents="none">
              <View style={styles.asistidoPunto} />
              <Text style={styles.asistidoText}>Encuadre asistido PERF</Text>
            </View>
          </>
        ) : (
          <View style={styles.sinPermiso}>
            <MaterialIcons name="photo-camera" size={40} color={colors.textMuted} />
            <Text style={styles.sinPermisoTitulo}>Necesitamos la cámara</Text>
            <Text style={styles.sinPermisoTexto}>
              {permiso && !permiso.canAskAgain
                ? 'Habilitá el permiso de cámara desde los ajustes del teléfono, o elegí una foto de la galería.'
                : 'Para fotografiar al animal rescatado. También podés elegir una foto de la galería.'}
            </Text>
            {permiso?.canAskAgain !== false && (
              <Pressable style={styles.permisoBtn} onPress={pedirPermiso}>
                <Text style={styles.permisoBtnText}>Permitir cámara</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      <View style={styles.controles}>
        <Pressable style={styles.lateral} onPress={abrirGaleria} accessibilityLabel="Elegir de la galería">
          <MaterialIcons name="photo-library" size={24} color={colors.primary} />
          <Text style={styles.lateralText}>Galería</Text>
        </Pressable>
        <Pressable
          style={[styles.disparador, !permiso?.granted && { opacity: 0.4 }]}
          onPress={sacarFoto}
          disabled={!permiso?.granted || !lista}
          accessibilityLabel="Sacar foto"
        >
          <View style={styles.disparadorInterno}>
            {sacando ? <ActivityIndicator color="#fff" /> : <MaterialIcons name="photo-camera" size={28} color="#fff" />}
          </View>
        </Pressable>
        <Pressable style={styles.lateral} onPress={() => setAvisoAudio(true)} accessibilityLabel="Nota de voz">
          <MaterialIcons name="mic" size={24} color={colors.atencion} />
          <Text style={styles.lateralText}>Audio</Text>
        </Pressable>
      </View>
      {avisoAudio && <Text style={styles.avisoAudio}>Las notas de voz estarán disponibles en una próxima versión.</Text>}

      <Pressable style={styles.omitir} onPress={onOmitir}>
        <MaterialIcons name="fast-forward" size={16} color={colors.textMuted} />
        <Text style={styles.omitirText}>Omitir foto por urgencia</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  progresoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pasoLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pasoText: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  pasoSub: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: colors.surfaceCard },
  tipText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  visor: { flex: 1, minHeight: 300, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1c1c19' },
  grilla: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  lineaV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  lineaH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  enfoque: { width: 60, height: 60, borderRadius: 9999, borderWidth: 2, borderColor: '#ffdcc3', alignItems: 'center', justifyContent: 'center' },
  enfoquePunto: { width: 6, height: 6, borderRadius: 9999, backgroundColor: '#ffdcc3' },
  flash: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999, backgroundColor: 'rgba(0,0,0,0.45)' },
  flashText: { fontFamily: fonts.bold, fontSize: 13, color: '#fff' },
  voltear: { position: 'absolute', top: 12, right: 12, width: 40, height: 40, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  asistido: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, backgroundColor: 'rgba(0,0,0,0.55)' },
  asistidoPunto: { width: 8, height: 8, borderRadius: 9999, backgroundColor: '#ffdcc3' },
  asistidoText: { fontFamily: fonts.semibold, fontSize: 13, color: '#fff' },
  sinPermiso: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24, backgroundColor: colors.surfaceMuted },
  sinPermisoTitulo: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  sinPermisoTexto: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  permisoBtn: { marginTop: 4, paddingHorizontal: 20, height: 44, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  permisoBtnText: { fontFamily: fonts.semibold, fontSize: 14, color: '#fff' },
  controles: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  lateral: { width: 76, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: colors.surfaceMuted },
  lateralText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  disparador: { width: 84, height: 84, borderRadius: 9999, borderWidth: 3, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  disparadorInterno: { width: 66, height: 66, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  avisoAudio: { textAlign: 'center', fontFamily: fonts.regular, fontSize: 12, color: colors.textSubtle },
  omitir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, marginBottom: 8 },
  omitirText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted },
});
