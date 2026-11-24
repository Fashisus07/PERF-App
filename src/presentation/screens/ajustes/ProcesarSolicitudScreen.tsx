import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authRepository } from '../../../di/container';
import { colors, fonts } from '../../theme';

type Props = {
  navigation?: any;
  route?: {
    params?: {
      accion?: string;
      id?: string;
      token?: string;
    };
  };
};

export function ProcesarSolicitudScreen({ navigation, route }: Props) {
  const { top, bottom } = useSafeAreaInsets();
  const [estado, setEstado] = useState<'cargando' | 'exito' | 'error'>('cargando');
  const [titulo, setTitulo] = useState('Procesando solicitud...');
  const [mensaje, setMensaje] = useState('Aguardá un instante mientras procesamos la acción en la base de datos.');
  const [esAprobacion, setEsAprobacion] = useState(true);

  useEffect(() => {
    let accion = route?.params?.accion;
    let id = route?.params?.id;
    let token = route?.params?.token;

    // Detectar también si los parámetros están en window.location (Web)
    if ((!accion || !id) && typeof window !== 'undefined' && window.location?.search) {
      const searchParams = new URLSearchParams(window.location.search);
      accion = accion || searchParams.get('accion') || undefined;
      id = id || searchParams.get('id') || undefined;
      token = token || searchParams.get('token') || undefined;
    }

    if (!accion || !id) {
      setEstado('error');
      setTitulo('Parámetros incompletos');
      setMensaje('No se recibieron los parámetros necesarios para procesar la postulación.');
      return;
    }

    const ejecutar = async () => {
      try {
        if (accion === 'aprobar_voluntario') {
          setEsAprobacion(true);
          if (!authRepository.aprobarVoluntario) throw new Error('Operación no disponible');
          const res = await authRepository.aprobarVoluntario(id!, token);
          if (res.success) {
            setEstado('exito');
            setTitulo('¡Voluntario Aprobado!');
            setMensaje(
              res.mensaje ||
                'La postulación ha sido aprobada. El voluntario ya fue validado en el sistema y puede iniciar sesión.'
            );
          } else {
            setEstado('error');
            setTitulo('No se pudo aprobar');
            setMensaje(res.mensaje);
          }
        } else if (accion === 'rechazar_voluntario') {
          setEsAprobacion(false);
          if (!authRepository.rechazarVoluntario) throw new Error('Operación no disponible');
          const res = await authRepository.rechazarVoluntario(id!, token);
          if (res.success) {
            setEstado('exito');
            setTitulo('Solicitud Rechazada');
            setMensaje(
              res.mensaje ||
                'La postulación fue rechazada. La cuenta y todos los datos asociados fueron eliminados permanentemente de la base de datos.'
            );
          } else {
            setEstado('error');
            setTitulo('No se pudo rechazar');
            setMensaje(res.mensaje);
          }
        } else {
          setEstado('error');
          setTitulo('Acción no reconocida');
          setMensaje(`La acción "${accion}" no es válida.`);
        }
      } catch (err: any) {
        setEstado('error');
        setTitulo('Error al procesar');
        setMensaje(err?.message || 'Ocurrió un error inesperado al procesar la solicitud.');
      }
    };

    ejecutar();
  }, [route?.params]);

  const irInicio = () => {
    // Limpiar query params en la URL web si existen
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    navigation?.reset?.({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <View style={[styles.screen, { paddingTop: top + 32, paddingBottom: bottom + 32 }]}>
      <View style={styles.card}>
        {estado === 'cargando' ? (
          <View style={styles.cargandoBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.titulo}>{titulo}</Text>
            <Text style={styles.mensaje}>{mensaje}</Text>
          </View>
        ) : estado === 'exito' ? (
          <View style={styles.resultadoBox}>
            <View
              style={[
                styles.iconBox,
                { backgroundColor: esAprobacion ? colors.primarySoft : '#FEE2E2' },
              ]}
            >
              <MaterialIcons
                name={esAprobacion ? 'check-circle' : 'delete-forever'}
                size={54}
                color={esAprobacion ? colors.primary : colors.urgente}
              />
            </View>
            <Text style={styles.titulo}>{titulo}</Text>
            <Text style={styles.mensaje}>{mensaje}</Text>
            <Pressable
              style={[
                styles.btnContinuar,
                { backgroundColor: esAprobacion ? colors.primary : '#374151' },
              ]}
              onPress={irInicio}
            >
              <MaterialIcons name="home" size={20} color="#FFFFFF" />
              <Text style={styles.btnContinuarText}>Ir al inicio de PERF Móvil</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.resultadoBox}>
            <View style={[styles.iconBox, { backgroundColor: colors.atencionBg }]}>
              <MaterialIcons name="warning" size={54} color={colors.atencion} />
            </View>
            <Text style={styles.titulo}>{titulo}</Text>
            <Text style={styles.mensaje}>{mensaje}</Text>
            <Pressable style={styles.btnContinuar} onPress={irInicio}>
              <MaterialIcons name="arrow-back" size={20} color="#FFFFFF" />
              <Text style={styles.btnContinuarText}>Volver a la aplicación</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cargandoBox: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 20,
  },
  resultadoBox: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  titulo: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
  },
  mensaje: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 380,
  },
  btnContinuar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    marginTop: 12,
    minWidth: 220,
  },
  btnContinuarText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
