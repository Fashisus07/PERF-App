import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { pedirDesbloqueo } from '../../../data/local/CandadoApp';
import { colors, fonts } from '../../theme';

type Props = {
  onDesbloqueado: () => void;
  onOtraCuenta: () => void;
};

/** Pantalla que tapa la app hasta que el voluntario pasa la huella (o el PIN del celular). */
export function PantallaCandado({ onDesbloqueado, onOtraCuenta }: Props) {
  const [verificando, setVerificando] = useState(false);
  const [fallo, setFallo] = useState(false);

  const desbloquear = useCallback(async () => {
    setVerificando(true);
    setFallo(false);
    try {
      if (await pedirDesbloqueo()) onDesbloqueado();
      else setFallo(true);
    } catch {
      setFallo(true);
    } finally {
      setVerificando(false);
    }
  }, [onDesbloqueado]);

  // Pide la huella apenas se abre la app.
  useEffect(() => {
    desbloquear();
  }, [desbloquear]);

  return (
    <View style={styles.screen}>
      <MaterialIcons name="lock" size={56} color={colors.primary} />
      <Text style={styles.titulo}>PERF Móvil</Text>
      <Text style={styles.texto}>
        {fallo ? 'No se pudo verificar. Probá de nuevo.' : 'Desbloqueá con tu huella o el PIN del celular.'}
      </Text>
      <Pressable
        style={[styles.boton, verificando && { opacity: 0.6 }]}
        onPress={desbloquear}
        disabled={verificando}
        accessibilityRole="button"
        accessibilityLabel="Desbloquear"
      >
        <MaterialIcons name="fingerprint" size={22} color="#fff" />
        <Text style={styles.botonTexto}>Desbloquear</Text>
      </Pressable>
      <Pressable onPress={onOtraCuenta} accessibilityRole="button" accessibilityLabel="Usar otra cuenta">
        <Text style={styles.link}>Usar otra cuenta</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  titulo: { fontFamily: fonts.bold, fontSize: 28, color: colors.text },
  texto: { fontFamily: fonts.regular, fontSize: 16, color: colors.textMuted, textAlign: 'center' },
  boton: {
    height: 56,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 9999,
    backgroundColor: colors.primary,
    marginTop: 8,
  },
  botonTexto: { fontFamily: fonts.semibold, fontSize: 16, color: '#fff' },
  link: { fontFamily: fonts.semibold, fontSize: 15, color: colors.primary, marginTop: 8 },
});
