import { useCallback, useContext, useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { NavigationContext } from '@react-navigation/native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authRepository } from '../../../di/container';
import { colors, fonts } from '../../theme';

export function obtenerIniciales(nombre?: string): string {
  const partes = (nombre || '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'PF';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

type EstadoAvatar = { iniciales: string; fotoUri: string | null };
let _avatarCache: EstadoAvatar = { iniciales: 'PF', fotoUri: null };
const _listeners = new Set<(estado: EstadoAvatar) => void>();

export function notificarCambioVoluntario(nombre?: string, fotoUri?: string | null): void {
  if (nombre !== undefined) {
    _avatarCache = {
      iniciales: obtenerIniciales(nombre),
      fotoUri: fotoUri !== undefined ? fotoUri : _avatarCache.fotoUri,
    };
    _listeners.forEach((fn) => fn(_avatarCache));
    return;
  }
  authRepository
    .obtenerVoluntarioActual()
    .then((vol) => {
      _avatarCache = {
        iniciales: obtenerIniciales(vol?.nombre),
        fotoUri: vol?.fotoUri ?? null,
      };
      _listeners.forEach((fn) => fn(_avatarCache));
    })
    .catch(() => {});
}

export function AvatarPerfil({ size = 36, onPress }: { size?: number; onPress?: () => void }) {
  const navigation = useContext(NavigationContext);
  const [estado, setEstado] = useState<EstadoAvatar>(_avatarCache);
  const [errorFoto, setErrorFoto] = useState(false);

  const cargar = useCallback(() => {
    authRepository
      .obtenerVoluntarioActual()
      .then((vol) => {
        const next: EstadoAvatar = {
          iniciales: obtenerIniciales(vol?.nombre),
          fotoUri: vol?.fotoUri ?? null,
        };
        _avatarCache = next;
        setErrorFoto(false);
        setEstado(next);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const listener = (val: EstadoAvatar) => {
      setErrorFoto(false);
      setEstado(val);
    };
    _listeners.add(listener);
    cargar();
    const unsub = (navigation as any)?.addListener?.('focus', cargar);
    return () => {
      _listeners.delete(listener);
      unsub?.();
    };
  }, [cargar, navigation]);

  const handlePress = onPress ?? (() => (navigation as any)?.navigate?.('PerfilVoluntario'));
  const badgeStyle = [
    styles.avatar,
    { width: size, height: size, borderRadius: size / 2 },
  ];
  const fontSize = Math.max(12, Math.round(size * 0.39));
  const contenido =
    estado.fotoUri && !errorFoto ? (
      <Image
        source={{ uri: estado.fotoUri }}
        style={{ width: size, height: size }}
        resizeMode="cover"
        onError={() => setErrorFoto(true)}
      />
    ) : (
      <Text style={[styles.avatarIniciales, { fontSize }]}>{estado.iniciales}</Text>
    );

  if (!navigation && !onPress) {
    return (
      <View style={badgeStyle} accessibilityLabel="Avatar del voluntario">
        {contenido}
      </View>
    );
  }

  return (
    <Pressable
      style={badgeStyle}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Ver perfil del voluntario"
      hitSlop={6}
    >
      {contenido}
    </Pressable>
  );
}

type Props = { titulo: string; subtitulo?: string; onCancelar: () => void };

// Encabezado de los 3 pasos: "× Cancelar", título centrado y avatar con iniciales.
export function EncabezadoRescate({ titulo, subtitulo, onCancelar }: Props) {
  const { top } = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: top, backgroundColor: colors.background }}>
      <View style={styles.row}>
        <Pressable style={styles.cancelar} onPress={onCancelar} accessibilityLabel="Cancelar">
          <MaterialIcons name="close" size={20} color={colors.text} />
          <Text style={styles.cancelarText}>Cancelar</Text>
        </Pressable>
        <View style={styles.centro} pointerEvents="none">
          <Text style={styles.titulo}>{titulo}</Text>
          {!!subtitulo && <Text style={styles.subtitulo}>{subtitulo}</Text>}
        </View>
        <AvatarPerfil />
      </View>
    </View>
  );
}

// Tres segmentos que se van llenando según el paso actual.
export function SegmentosPaso({ paso }: { paso: 1 | 2 | 3 }) {
  return (
    <View style={styles.segmentos}>
      {[1, 2, 3].map((n) => (
        <View key={n} style={[styles.segmento, n <= paso && styles.segmentoLleno]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    overflow: 'hidden',
  },
  avatarIniciales: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.onPrimary,
    letterSpacing: 0.4,
  },
  row: { height: 64, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cancelar: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44 },
  cancelarText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  centro: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  titulo: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  subtitulo: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSubtle },
  segmentos: { flexDirection: 'row', gap: 6 },
  segmento: { flex: 1, height: 6, borderRadius: 9999, backgroundColor: colors.surfaceChip },
  segmentoLleno: { backgroundColor: colors.primary },
});
