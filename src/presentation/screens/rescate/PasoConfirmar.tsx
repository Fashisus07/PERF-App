import { MaterialIcons } from '@expo/vector-icons';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ETIQUETA_CASTRACION,
  ETIQUETA_ESPECIE,
  ETIQUETA_VIRALES,
} from '../../../domain/models/Caso';
import { BorradorRescate } from '../../../domain/models/Rescate';
import { colors, fonts } from '../../theme';
import { SegmentosPaso } from './BarraRescate';

type Props = {
  borrador: BorradorRescate;
  sinConexion: boolean;
  guardando: boolean;
  onVolver: () => void;
  onGuardar: () => void;
};

export function PasoConfirmar({ borrador: b, sinConexion, guardando, onVolver, onGuardar }: Props) {
  const nombre = b.nombreProvisorio.trim() || 'Sin nombre';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <View style={styles.pasoRow}>
        <Text style={styles.pasoText}>
          <Text style={styles.pasoBold}>Paso 3 de 3</Text> · Confirmación
        </Text>
        <Pressable style={styles.volver} onPress={onVolver}>
          <MaterialIcons name="arrow-back" size={16} color={colors.text} />
          <Text style={styles.volverText}>Volver</Text>
        </Pressable>
      </View>
      <SegmentosPaso paso={3} />

      <View style={styles.card}>
        <View style={styles.hero}>
          {b.fotoUri ? (
            <Image source={{ uri: b.fotoUri }} style={styles.heroImg} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImg, styles.heroVacio]}>
              <MaterialIcons name="pets" size={56} color={colors.textSubtle} />
            </View>
          )}
          <View style={styles.badgeNuevo}>
            <View style={styles.punto} />
            <Text style={styles.badgeNuevoText}>Nuevo rescate</Text>
          </View>
        </View>

        <View style={[styles.alerta, { backgroundColor: b.esUrgente ? colors.urgenteBg : colors.aldiaBg }]}>
          <View style={styles.alertaIzq}>
            <MaterialIcons
              name={b.esUrgente ? 'emergency' : 'check-circle'}
              size={18}
              color={b.esUrgente ? colors.urgente : colors.aldia}
            />
            <Text style={[styles.alertaText, { color: b.esUrgente ? colors.urgente : colors.aldia }]}>
              {b.esUrgente ? 'Caso prioritario / Urgente' : 'Ingreso estándar'}
            </Text>
          </View>
          <View style={styles.alertaIzq}>
            <MaterialIcons name="schedule" size={14} color={colors.textMuted} />
            <Text style={styles.alertaHora}>Hoy</Text>
          </View>
        </View>

        <View style={styles.cuerpo}>
          <View style={styles.nombreRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nombre}>{nombre}</Text>
              <Text style={styles.sub}>
                {b.especie ? ETIQUETA_ESPECIE[b.especie] : 'Animal'}
                {b.edadEstimada ? ` · ${b.edadEstimada}` : ''}
                {b.cantidadAnimales > 1 ? ` (Camada x${b.cantidadAnimales})` : ''}
              </Text>
            </View>
            <View style={styles.pata}>
              <MaterialIcons name="pets" size={22} color={colors.primary} />
            </View>
          </View>

          <View style={styles.separador} />

          {/* Ficha rápida */}
          <View style={styles.filas}>
            <View style={styles.fila}>
              <MaterialIcons name="place" size={18} color={colors.primary} />
              <View style={styles.filaInfo}>
                <Text style={styles.filaLabel}>Barrio del hallazgo</Text>
                <Text style={styles.filaValor}>{b.barrio || 'Sin especificar'}</Text>
                {b.coordenadas && (
                  <Text style={styles.filaSub}>
                    GPS: {b.coordenadas.latitud.toFixed(4)}, {b.coordenadas.longitud.toFixed(4)}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.fila}>
              <MaterialIcons name="home" size={18} color={colors.primary} />
              <View style={styles.filaInfo}>
                <Text style={styles.filaLabel}>Hogar de tránsito</Text>
                <Text style={styles.filaValor}>
                  {b.transitoNombre || 'Pendiente de asignación'}
                  {b.transitoTelefono ? ` (${b.transitoTelefono})` : ''}
                </Text>
              </View>
            </View>

            <View style={styles.fila}>
              <MaterialIcons name="person" size={18} color={colors.primary} />
              <View style={styles.filaInfo}>
                <Text style={styles.filaLabel}>Coordinador PERF</Text>
                <Text style={styles.filaValor}>{b.quienSigueCaso || 'No asignado'}</Text>
              </View>
            </View>

            <View style={styles.fila}>
              <MaterialIcons name="medical-services" size={18} color={colors.primary} />
              <View style={styles.filaInfo}>
                <Text style={styles.filaLabel}>Sanidad</Text>
                <Text style={styles.filaValor}>
                  Castrado: {ETIQUETA_CASTRACION[b.castrado || 'PENDIENTE']} · Virales: {ETIQUETA_VIRALES[b.virales || 'PENDIENTE']}
                </Text>
              </View>
            </View>

            {b.historiaOrigen ? (
              <View style={styles.fila}>
                <MaterialIcons name="history-edu" size={18} color={colors.primary} />
                <View style={styles.filaInfo}>
                  <Text style={styles.filaLabel}>Historia de origen</Text>
                  <Text style={styles.filaValor}>{b.historiaOrigen}</Text>
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.offlineBox}>
            <MaterialIcons
              name={sinConexion ? 'cloud-off' : 'cloud-done'}
              size={18}
              color={sinConexion ? colors.textMuted : colors.primary}
            />
            <Text style={styles.offlineText}>
              {sinConexion
                ? 'Modo sin conexión activo: se guardará de forma local en SQLite.'
                : 'Conectado a la red: se guardará en SQLite y encolará sincronización.'}
            </Text>
          </View>
        </View>
      </View>

      <Pressable style={styles.btnGuardar} onPress={onGuardar} disabled={guardando}>
        {guardando ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <>
            <MaterialIcons name="save" size={20} color={colors.onPrimary} />
            <Text style={styles.btnGuardarText}>Guardar Ficha en SQLite</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: { padding: 16, paddingBottom: 60, gap: 14 },
  pasoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pasoText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  pasoBold: { fontFamily: fonts.bold, color: colors.primary },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  volverText: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  hero: { height: 180, width: '100%', position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  heroVacio: { backgroundColor: colors.surfaceChip, alignItems: 'center', justifyContent: 'center' },
  badgeNuevo: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  punto: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.aldia },
  badgeNuevoText: { fontFamily: fonts.semibold, fontSize: 12, color: '#fff' },
  alerta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  alertaIzq: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  alertaText: { fontFamily: fonts.bold, fontSize: 13 },
  alertaHora: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  cuerpo: { padding: 16, gap: 12 },
  nombreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nombre: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  sub: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
  pata: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separador: { height: 1, backgroundColor: colors.borderLight, marginVertical: 4 },
  filas: { gap: 12 },
  fila: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  filaInfo: { flex: 1, gap: 2 },
  filaLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textSubtle },
  filaValor: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  filaSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  offlineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceChip,
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  offlineText: { flex: 1, fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  btnGuardar: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnGuardarText: { fontFamily: fonts.bold, fontSize: 16, color: colors.onPrimary },
});
