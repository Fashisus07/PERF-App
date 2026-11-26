import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { esAdministrador, RolVoluntario } from '../../domain/models/Ajustes';
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

type Props = { nombre: string; fotoUri?: string | null; rol?: RolVoluntario; tamano?: number };

/** Foto de perfil circular (cover) con respaldo automático en las iniciales si no hay imagen o falla la carga. */
export function AvatarIniciales({ nombre, fotoUri, rol = 'voluntario', tamano = 52 }: Props) {
  const admin = esAdministrador(rol);
  const [errorFoto, setErrorFoto] = useState(false);

  useEffect(() => {
    setErrorFoto(false);
  }, [fotoUri]);

  const mostrarFoto = !!fotoUri && !errorFoto;

  return (
    <View
      style={[
        styles.circulo,
        { width: tamano, height: tamano, borderRadius: tamano / 2 },
        admin && styles.circuloAdmin,
      ]}
    >
      {mostrarFoto ? (
        <Image
          source={{ uri: fotoUri! }}
          style={{ width: tamano, height: tamano }}
          resizeMode="cover"
          onError={() => setErrorFoto(true)}
        />
      ) : (
        <Text style={[styles.texto, { fontSize: tamano * 0.37 }, admin && { color: colors.onPrimary }]}>
          {iniciales(nombre)}
        </Text>
      )}
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
    overflow: 'hidden',
  },
  circuloAdmin: { backgroundColor: colors.primary },
  texto: { fontFamily: fonts.bold, color: colors.primary },
});
