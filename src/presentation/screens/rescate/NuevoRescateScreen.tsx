import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorradorRescate, borradorVacio } from '../../../domain/models/Rescate';
import { useOnline } from '../../hooks/useOnline';
import { useRegistrarRescate } from '../../hooks/useRegistrarRescate';
import { colors } from '../../theme';
import { EncabezadoRescate } from './BarraRescate';
import { PasoConfirmar } from './PasoConfirmar';
import { PasoDatos } from './PasoDatos';
import { PasoFoto } from './PasoFoto';

type Params = { borrador?: BorradorRescate; paso?: 1 | 2 | 3 };

const LOGO = require('../../../../assets/images/logo.png');

// Flujo de 3 pasos: foto -> datos -> confirmar. El borrador vive acá y se va completando.
export function NuevoRescateScreen({ route, navigation }: { route?: { params?: Params }; navigation?: any }) {
  const { bottom } = useSafeAreaInsets();
  const online = useOnline();
  const registrar = useRegistrarRescate();
  const [paso, setPaso] = useState<1 | 2 | 3>(route?.params?.paso ?? 1);
  const [borrador, setBorrador] = useState<BorradorRescate>(route?.params?.borrador ?? borradorVacio());
  const [guardando, setGuardando] = useState(false);

  const actualizar = (cambios: Partial<BorradorRescate>) => setBorrador((b) => ({ ...b, ...cambios }));

  const guardar = async () => {
    setGuardando(true);
    try {
      const caso = await registrar.ejecutar(borrador, !online);
      navigation?.replace?.('RescateGuardado', { casoId: caso.id, sinConexion: !online });
    } catch (e) {
      navigation?.replace?.('ErrorGuardado', { borrador, motivo: e instanceof Error ? e.message : undefined });
    } finally {
      setGuardando(false);
    }
  };

  const titulo = 'Nuevo Rescate';
  return (
    <View style={styles.screen}>
      <EncabezadoRescate
        titulo={titulo}
        subtitulo={paso === 1 ? 'Paso 1 de 3' : undefined}
        onCancelar={() => navigation?.goBack?.()}
      />
      {paso === 1 ? (
        <PasoFoto
          onFoto={(fotoUri) => {
            actualizar({ fotoUri });
            setPaso(2);
          }}
          onOmitir={() => {
            actualizar({ fotoUri: undefined });
            setPaso(2);
          }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 + bottom }}
          keyboardShouldPersistTaps="handled"
        >
          {paso === 2 ? (
            <PasoDatos
              borrador={borrador}
              onCambio={actualizar}
              onVolverAFoto={() => setPaso(1)}
              onContinuar={() => setPaso(3)}
            />
          ) : (
            <PasoConfirmar
              borrador={borrador}
              sinConexion={!online}
              guardando={guardando}
              onVolver={() => setPaso(2)}
              onGuardar={guardar}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
});
