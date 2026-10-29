import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  calcularUrgencia,
  diasEnEspera,
  ETIQUETA_CASTRACION,
  ETIQUETA_ESTADO,
  ETIQUETA_EVENTO,
  ETIQUETA_VIRALES,
  EventoHistorial,
} from '../../../domain/models/Caso';
import { StackHeader } from '../../components/StackHeader';
import { UrgenciaBadge } from '../../components/UrgenciaBadge';
import { useCaso } from '../../hooks/useCaso';
import { colors, fonts } from '../../theme';
import { ESTADOS_CASO } from '../estado/estadosCaso';

const FOTO_DEFAULT = require('../../../../assets/images/casos/misho.jpg');
const COLOR_PUNTO = [colors.primary, colors.atencion, '#bdc9c6'];

type Props = {
  route?: { params?: { casoId: string; estadoActualizado?: boolean } };
  navigation?: any;
};

export function DetalleCasoScreen({ route, navigation }: Props) {
  const { bottom } = useSafeAreaInsets();
  const casoId = route?.params?.casoId ?? '';
  const { caso, historial, cargando } = useCaso(casoId);
  const [favorito, setFavorito] = useState(false);
  const [aviso, setAviso] = useState(false);

  const estadoActualizado = route?.params?.estadoActualizado;
  useEffect(() => {
    if (!estadoActualizado) return;
    setAviso(true);
    const t = setTimeout(() => setAviso(false), 2500);
    return () => clearTimeout(t);
  }, [estadoActualizado]);

  const header = <StackHeader titulo="Ficha Operativa del Caso" onBack={() => navigation?.goBack?.()} />;

  if (cargando || !caso) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.centro}>
          {cargando ? (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.vacio, { marginTop: 12 }]}>Cargando ficha operativa...</Text>
            </>
          ) : (
            <View style={styles.errorBox}>
              <View style={styles.errorCircle}>
                <MaterialIcons name="pets" size={48} color={colors.textMuted} />
              </View>
              <Text style={styles.errorTitle}>Caso no encontrado</Text>
              <Text style={styles.errorSub}>
                No se encontró este caso en la base de datos local o fue removido.
              </Text>
              <Pressable style={styles.btnVolver} onPress={() => navigation?.goBack?.()}>
                <MaterialIcons name="arrow-back" size={18} color="#fff" />
                <Text style={styles.btnVolverText}>Volver al listado</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  }

  const urgencia = calcularUrgencia(caso, 10);
  const dias = diasEnEspera(caso);
  const estadoActual = caso.estadoCaso ?? 'EN_TRANSITO';
  const esArchivado = estadoActual === 'ADOPTADO' || estadoActual === 'FALLECIDO';
  const fotoSource = caso.fotoUri ? { uri: caso.fotoUri } : FOTO_DEFAULT;
  const fechaRescateTexto = new Date(caso.fechaRescate).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const abrirMapa = () => {
    if (caso.coordenadas) {
      const url = `https://www.google.com/maps/search/?api=1&query=${caso.coordenadas.latitud},${caso.coordenadas.longitud}`;
      Linking.openURL(url).catch(() => {});
    }
  };

  const llamarTransito = () => {
    if (caso.transito.telefono) {
      Linking.openURL(`tel:${caso.transito.telefono}`).catch(() => {});
    }
  };

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={[styles.main, { paddingBottom: 60 + bottom }]}>
        {/* Hero con foto e identificación */}
        <View style={styles.hero}>
          <Image source={fotoSource} style={styles.heroImg} resizeMode="cover" />
          <View style={styles.badgesRow}>
            <UrgenciaBadge urgencia={urgencia} grande />
            <View style={styles.badgeEspera}>
              <Text style={styles.badgeEsperaText}>
                {dias} {dias === 1 ? 'día' : 'días'} en espera
              </Text>
              <MaterialIcons name="hourglass-top" size={16} color={colors.atencion} />
            </View>
            {caso.syncStatus === 'PENDING' && (
              <View style={styles.badgeSync}>
                <MaterialIcons name="cloud-queue" size={14} color="#fff" />
                <Text style={styles.badgeSyncText}>Offline</Text>
              </View>
            )}
          </View>

          <View style={styles.nameRow}>
            <View style={styles.nameInfo}>
              <View style={styles.nameLine}>
                <Text style={styles.nombre}>{caso.nombreProvisorio}</Text>
                {caso.cantidadAnimales > 1 && (
                  <View style={styles.badgeCamada}>
                    <Text style={styles.badgeCamadaText}>Camada x{caso.cantidadAnimales}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.subtitulo}>
                {caso.especie} · {caso.edadEstimada || 'Edad a determinar'} · Coordina: {caso.quienSigueCaso || 'PERF'}
              </Text>
            </View>
            <Pressable
              style={styles.star}
              onPress={() => setFavorito((f) => !f)}
              accessibilityLabel={favorito ? 'Quitar de favoritos' : 'Marcar como favorito'}
            >
              <MaterialIcons name={favorito ? 'star' : 'star-border'} size={24} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Datos Principales de Rescate */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <View style={[styles.infoIcon, { backgroundColor: '#9cf2e8' }]}>
              <MaterialIcons name="calendar-today" size={20} color="#00201d" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Fecha Rescate</Text>
              <Text style={styles.infoValue}>{fechaRescateTexto}</Text>
            </View>
          </View>

          <Pressable
            style={[styles.infoCard, !!caso.coordenadas && styles.infoCardClickeable]}
            onPress={abrirMapa}
            disabled={!caso.coordenadas}
          >
            <View style={[styles.infoIcon, { backgroundColor: colors.atencionBg }]}>
              <MaterialIcons name="location-on" size={20} color={colors.atencionText} />
            </View>
            <View style={[styles.infoText, { flex: 1 }]}>
              <Text style={styles.infoLabel}>Barrio Hallazgo</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{caso.barrio}</Text>
              {caso.coordenadas ? (
                <Text style={styles.infoSub}>Ver en mapa GPS</Text>
              ) : null}
            </View>
          </Pressable>
        </View>

        {/* Estado Operativo */}
        <View style={styles.estadoSection}>
          <View style={styles.estadoHeader}>
            <Text style={styles.seccionTitulo}>Estado Operativo</Text>
            <Pressable onPress={() => navigation?.navigate?.('CambioEstado', { casoId: caso.id })}>
              <Text style={styles.link}>Cambiar estado</Text>
            </Pressable>
          </View>
          <View style={styles.chips}>
            {ESTADOS_CASO.map((e) => {
              const activo = e.key === estadoActual;
              const color = activo ? colors.onPrimary : colors.textMuted;
              return (
                <View key={e.key} style={[styles.chip, activo && styles.chipActivo]}>
                  <Text style={[styles.chipText, { color }]}>{ETIQUETA_ESTADO[e.key]}</Text>
                  <MaterialIcons name={e.iconoChip} size={16} color={color} />
                </View>
              );
            })}
          </View>
        </View>

        {/* Ficha Sanitaria Felina */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitulo}>
              <MaterialIcons name="medical-services" size={22} color={colors.primary} />
              <Text style={styles.seccionTitulo}>Ficha Sanitaria</Text>
            </View>
            <Pressable
              style={styles.btnEditarSanidad}
              onPress={() => navigation?.navigate?.('EditarSanidad', { casoId: caso.id })}
              accessibilityLabel="Editar ficha sanitaria"
            >
              <MaterialIcons name="edit" size={16} color={colors.primary} />
              <Text style={styles.btnEditarText}>Editar sanidad</Text>
            </Pressable>
          </View>

          <View style={styles.sanidadGrid}>
            <View style={styles.sanidadItem}>
              <Text style={styles.sanidadLabel}>Castración</Text>
              <Text style={styles.sanidadValor}>{ETIQUETA_CASTRACION[caso.sanidad.castrado]}</Text>
            </View>

            <View style={styles.sanidadItem}>
              <Text style={styles.sanidadLabel}>Virales VIF / ViLeF</Text>
              <Text style={styles.sanidadValor}>{ETIQUETA_VIRALES[caso.sanidad.virales]}</Text>
            </View>

            <View style={styles.sanidadItem}>
              <Text style={styles.sanidadLabel}>1° Desparasitación</Text>
              <Text style={styles.sanidadValor}>
                {caso.sanidad.fechaPrimeraDesparasitacion
                  ? new Date(caso.sanidad.fechaPrimeraDesparasitacion).toLocaleDateString('es-AR')
                  : 'Pendiente'}
              </Text>
            </View>

            <View style={styles.sanidadItem}>
              <Text style={styles.sanidadLabel}>2° Desparasitación</Text>
              <Text style={styles.sanidadValor}>
                {caso.sanidad.fechaSegundaDesparasitacion
                  ? new Date(caso.sanidad.fechaSegundaDesparasitacion).toLocaleDateString('es-AR')
                  : 'Pendiente'}
              </Text>
            </View>
          </View>

          {caso.estadoVisible ? (
            <View style={styles.notas}>
              <Text style={styles.notasTitulo}>Condición visible al rescate:</Text>
              <Text style={styles.notasText}>{caso.estadoVisible}</Text>
            </View>
          ) : null}
        </View>

        {/* Hogar de Tránsito */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitulo}>
              <MaterialIcons name="home" size={22} color={colors.primary} />
              <Text style={styles.seccionTitulo}>Hogar de Tránsito</Text>
            </View>
          </View>

          <View style={styles.transitoRow}>
            <View style={styles.transitoInfo}>
              <Text style={styles.transitoNombre}>
                {caso.transito.nombre || 'Sin hogar de tránsito asignado'}
              </Text>
              <Text style={styles.transitoTelefono}>
                {caso.transito.telefono || 'Sin celular de contacto registrado'}
              </Text>
              {caso.transito.correo ? (
                <Text style={styles.transitoSub}>{caso.transito.correo}</Text>
              ) : null}
            </View>

            {caso.transito.telefono ? (
              <Pressable
                style={styles.llamarBtn}
                onPress={llamarTransito}
                accessibilityLabel="Llamar al tránsito"
              >
                <MaterialIcons name="call" size={20} color="#fff" />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Historia y Comportamiento */}
        {(caso.historiaOrigen || caso.personalidad) && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitulo}>
                <MaterialIcons name="psychology" size={22} color={colors.primary} />
                <Text style={styles.seccionTitulo}>Historia y Comportamiento</Text>
              </View>
            </View>

            {caso.historiaOrigen ? (
              <View style={styles.bloqueTexto}>
                <Text style={styles.bloqueLabel}>Antecedentes / Origen:</Text>
                <Text style={styles.bloqueContenido}>{caso.historiaOrigen}</Text>
              </View>
            ) : null}

            {caso.personalidad ? (
              <View style={styles.bloqueTexto}>
                <Text style={styles.bloqueLabel}>Personalidad:</Text>
                <Text style={styles.bloqueContenido}>{caso.personalidad}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Historial de Eventos (SQLite) */}
        <View style={[styles.card, { gap: 16 }]}>
          <View style={styles.cardHeader}>
            <View>
              <View style={styles.cardTitulo}>
                <MaterialIcons name="history" size={22} color={colors.primary} />
                <Text style={styles.seccionTitulo}>Línea de Tiempo Operativa</Text>
              </View>
              <Text style={styles.cantidad}>
                {historial.length} {historial.length === 1 ? 'evento registrado' : 'eventos registrados'}
              </Text>
            </View>
            <Pressable
              style={styles.btnEditarSanidad}
              onPress={() => navigation?.navigate?.('NuevaNotaHistorial', { casoId: caso.id })}
              accessibilityLabel="Agregar nota"
            >
              <MaterialIcons name="add-comment" size={16} color={colors.primary} />
              <Text style={styles.btnEditarText}>+ Nota</Text>
            </Pressable>
          </View>

          {historial.length > 0 ? (
            <View>
              {historial.map((ev, i) => (
                <ItemHistorial
                  key={ev.id || i}
                  evento={ev}
                  color={COLOR_PUNTO[Math.min(i, 2)]}
                  ultimo={i === historial.length - 1}
                />
              ))}
            </View>
          ) : (
            <View style={styles.historialVacio}>
              <MaterialIcons name="info-outline" size={20} color={colors.textSubtle} />
              <Text style={styles.historialVacioTexto}>
                Aún no hay notas o eventos clínicos registrados.
              </Text>
            </View>
          )}
        </View>

        {/* Acciones principales */}
        <View style={styles.acciones}>
          {esArchivado ? (
            <View style={styles.archivadoBox}>
              <View style={styles.archivadoHeader}>
                <MaterialIcons name="archive" size={22} color={colors.primary} />
                <Text style={styles.archivadoTitulo}>Caso en Archivo Histórico</Text>
              </View>
              <Text style={styles.archivadoDesc}>
                Este animal completó su ciclo de rescate ({ETIQUETA_ESTADO[estadoActual]}). La ficha permanece para consulta histórica.
              </Text>
              <Pressable
                style={styles.btnEstado}
                onPress={() => navigation?.navigate?.('CambioEstado', { casoId: caso.id })}
              >
                <MaterialIcons name="swap-horiz" size={20} color={colors.primary} />
                <Text style={styles.btnEstadoText}>Cambiar estado o reactivar caso</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Pressable
                style={styles.btnTurno}
                onPress={() => navigation?.navigate?.('AgendarTurno', { casoId: caso.id })}
              >
                <MaterialIcons name="event-available" size={22} color="#fff" />
                <Text style={styles.btnTurnoText}>Agendar turno veterinario</Text>
              </Pressable>

              <Pressable
                style={styles.btnEstado}
                onPress={() => navigation?.navigate?.('CambioEstado', { casoId: caso.id })}
              >
                <MaterialIcons name="swap-horiz" size={20} color={colors.primary} />
                <Text style={styles.btnEstadoText}>Actualizar estado del caso</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>

      {aviso && (
        <View style={[styles.toast, { bottom: 24 + bottom }]} pointerEvents="none">
          <MaterialIcons name="check-circle" size={20} color={colors.toastIcon} />
          <Text style={styles.toastText}>Estado actualizado con éxito</Text>
        </View>
      )}
    </View>
  );
}

function ItemHistorial({ evento, color, ultimo }: { evento: EventoHistorial; color: string; ultimo: boolean }) {
  const fechaTexto = new Date(evento.fecha).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.itemRow}>
      <View style={styles.dotCol}>
        <View style={[styles.dot, { backgroundColor: color }]}>
          <View style={styles.dotInner} />
        </View>
        {!ultimo && <View style={styles.linea} />}
      </View>
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemTipo}>{ETIQUETA_EVENTO[evento.tipo] || evento.tipo}</Text>
          <Text style={styles.itemFecha}>{fechaTexto}</Text>
        </View>
        <Text style={styles.itemDetalle}>{evento.descripcion}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  vacio: { fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted },
  main: { padding: 16, gap: 16 },
  hero: {
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surfaceChip,
  },
  heroImg: { width: '100%', height: '100%' },
  badgesRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeEspera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeEsperaText: { fontFamily: fonts.semibold, fontSize: 12, color: '#fff' },
  badgeSync: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(217, 119, 6, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeSyncText: { fontFamily: fonts.bold, fontSize: 11, color: '#fff' },
  nameRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 40,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  nameInfo: { flex: 1, gap: 4 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nombre: { fontFamily: fonts.bold, fontSize: 22, color: '#fff' },
  badgeCamada: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeCamadaText: { fontFamily: fonts.bold, fontSize: 12, color: '#fff' },
  subtitulo: { fontFamily: fonts.medium, fontSize: 13, color: '#e0e0e0' },
  star: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoGrid: { flexDirection: 'row', gap: 12 },
  infoCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoCardClickeable: { borderWidth: 1, borderColor: colors.primarySoft || '#E8F5E9' },
  infoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoText: { gap: 2 },
  infoLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSubtle },
  infoValue: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  infoSub: { fontFamily: fonts.semibold, fontSize: 11, color: colors.primary },
  estadoSection: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  estadoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seccionTitulo: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceChip,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chipActivo: { backgroundColor: colors.primary },
  chipText: { fontFamily: fonts.semibold, fontSize: 13 },
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitulo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cantidad: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSubtle, marginTop: 2 },
  sanidadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sanidadItem: {
    width: '48%',
    backgroundColor: colors.surfaceChip,
    padding: 10,
    borderRadius: 10,
    gap: 4,
  },
  sanidadLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSubtle },
  sanidadValor: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  notas: {
    backgroundColor: colors.surfaceChip,
    padding: 12,
    borderRadius: 10,
    gap: 4,
  },
  notasTitulo: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textSubtle },
  notasText: { fontFamily: fonts.regular, fontSize: 13, color: colors.text },
  transitoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  transitoInfo: { flex: 1, gap: 2 },
  transitoNombre: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  transitoTelefono: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  transitoSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSubtle },
  llamarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloqueTexto: { gap: 4 },
  bloqueLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSubtle },
  bloqueContenido: { fontFamily: fonts.regular, fontSize: 14, color: colors.text, lineHeight: 20 },
  itemRow: { flexDirection: 'row', gap: 12 },
  dotCol: { alignItems: 'center', width: 20 },
  dot: { width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  dotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  linea: { width: 2, flex: 1, backgroundColor: '#e0e0e0', marginVertical: 4 },
  itemContent: { flex: 1, paddingBottom: 16, gap: 4 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemTipo: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  itemFecha: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSubtle },
  itemDetalle: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  acciones: { gap: 10, marginTop: 8 },
  btnTurno: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnTurnoText: { fontFamily: fonts.bold, fontSize: 15, color: '#fff' },
  btnEstado: {
    height: 48,
    backgroundColor: colors.surfaceChip,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnEstadoText: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.toastBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
  },
  toastText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.toastText },
  errorBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorCircle: {
    width: 80,
    height: 80,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceChip,
  },
  errorTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  errorSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  btnVolver: {
    marginTop: 8,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    borderRadius: 9999,
  },
  btnVolverText: { fontFamily: fonts.semibold, fontSize: 14, color: '#fff' },

  archivadoBox: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  archivadoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  archivadoTitulo: { fontFamily: fonts.bold, fontSize: 16, color: colors.primary },
  archivadoDesc: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  btnEditarSanidad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  btnEditarText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primary,
  },
  historialVacio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceChip,
    padding: 12,
    borderRadius: 10,
  },
  historialVacioTexto: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSubtle,
    flex: 1,
  },
});
