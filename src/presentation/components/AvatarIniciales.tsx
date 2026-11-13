import { StyleSheet, Text, View } from 'react-native';
import { RolUsuario } from '../../domain/models/Ajustes';
import { colors, fonts } from '../theme';

export function iniciales(nombre: string) {
  const letras = nombre
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return letras || 'VO';
}

type Props = { nombre: string; rol?: RolUsuario; tamano?: number };

/** Círculo con las iniciales; el administrador se distingue con el color de acento. */
export function AvatarIniciales({ nombre, rol = 'voluntario', tamano = 52 }: Props) {
  const admin = rol === 'administrador';
  return (
    <View
      style={[
        styles.circulo,
        { width: tamano, height: tamano, borderRadius: tamano / 2 },
        admin && styles.circuloAdmin,
      ]}
    >
      <Text style={[styles.texto, { fontSize: tamano * 0.37 }, admin && { color: colors.onPrimary }]}>
        {iniciales(nombre)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circulo: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circuloAdmin: { backgroundColor: colors.primary },
  texto: { fontFamily: fonts.bold, color: colors.primary },
});
