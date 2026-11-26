import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';

type Props = { favorito: boolean; onAlternar: () => void };

/**
 * Estrella de favorito con un detalle: al marcarla aparece la carita de un gato que salta a un costado
 * y la estrella "hace pop". Cada toque corta la animación anterior y arranca de cero, así que se puede
 * tocar muchas veces seguidas sin que se trabe ni se acumule nada.
 */
export function BotonFavorito({ favorito, onAlternar }: Props) {
  const gato = useRef(new Animated.Value(0)).current; // progreso del gatito, 0 a 1
  const estrella = useRef(new Animated.Value(1)).current; // escala de la estrella

  const tocar = () => {
    const quedaMarcado = !favorito;
    onAlternar();

    gato.stopAnimation();
    estrella.stopAnimation();
    gato.setValue(0);
    estrella.setValue(1);

    if (quedaMarcado) {
      Animated.timing(gato, { toValue: 1, duration: 750, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      Animated.sequence([
        Animated.delay(220),
        Animated.timing(estrella, { toValue: 1.6, duration: 110, useNativeDriver: true }),
        Animated.spring(estrella, { toValue: 1, friction: 3, tension: 140, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.sequence([
        Animated.timing(estrella, { toValue: 0.7, duration: 80, useNativeDriver: true }),
        Animated.spring(estrella, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
  };

  const gatoStyle = {
    opacity: gato.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
    transform: [
      { translateX: gato.interpolate({ inputRange: [0, 1], outputRange: [0, -34] }) },
      { translateY: gato.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, -6, 0] }) },
      { scale: gato.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.4, 1.2, 1] }) },
    ],
  };

  return (
    <Pressable
      style={styles.boton}
      onPress={tocar}
      accessibilityLabel={favorito ? 'Quitar de favoritos' : 'Marcar como favorito'}
    >
      <Animated.View pointerEvents="none" style={[styles.gato, gatoStyle]}>
        <MaterialCommunityIcons name="cat" size={28} color="#FFD54F" />
      </Animated.View>
      <Animated.View style={{ transform: [{ scale: estrella }] }}>
        <MaterialIcons name={favorito ? 'star' : 'star-border'} size={24} color={favorito ? '#FFD54F' : '#fff'} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gato: { position: 'absolute', left: 8, top: 7 },
});
