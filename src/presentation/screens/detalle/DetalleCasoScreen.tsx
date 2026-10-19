import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ETIQUETA_ESTADO, EventoHistorial, rescateDe } from '../../../domain/models/Caso';
import { StackHeader } from '../../components/StackHeader';
import { UrgenciaBadge } from '../../components/UrgenciaBadge';
import { useCaso } from '../../hooks/useCaso';
import { colors, fonts } from '../../theme';
import { ESTADOS_CASO } from '../estado/estadosCaso';

// Color del punto de la línea de tiempo: el evento más reciente destaca, el resto se apaga.
const COLOR_PUNTO = [colors.primary, colors.atencion, '#bdc9c6'];

type Props = {
  route?: { params?: { casoId: string; estadoActualizado?: boolean } };
  navigation?: any;
};

export function DetalleCasoScreen({ route, navigation }: Props) {
  const { bottom } = useSafeAreaInsets();
  const { caso, cargando } = useCaso(route?.params?.casoId ?? '');
  const [favorito, setFavorito] = useState(false);
  const [aviso, setAviso] = useState(false);

  // Después de cambiar el estado, se avisa unos segundos con un toast.
  const estadoActualizado = route?.params?.estadoActualizado;
  useEffect(() => {
    if (!estadoActualizado) return;
    setAviso(true);
    const t = setTimeout(() => setAviso(false), 2500);
    return () => clearTimeout(t);
  }, [estadoActualizado]);

  const header = <StackHeader titulo="Detalle De Caso" onBack={() => navigation?.goBack?.()} />;

  if (cargando || !caso) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.centro}>
          {cargando ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.vacio}>No encontramos este caso.</Text>
          )}
        </View>
      </View>
    );
  }

  const estadoActual = caso.estadoCaso ?? 'calle';
  const subtitulo = [
    caso.sexo === 'macho' ? 'Macho' : caso.sexo === 'hembra' ? 'Hembra' : null,
    caso.edadAprox,
    caso.condicion,
  ]
    .filter(Boolean)
    .join(' • ');
  const historial = caso.historial ?? [];
  const rescate = rescateDe(caso);

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.main}>
        <View style={styles.hero}>
          <Image source={caso.foto} style={styles.heroImg} resizeMode="cover" />
          <View style={styles.badgesRow}>
            <UrgenciaBadge urgencia={caso.urgencia} grande />
            <View style={styles.badgeEspera}>
              <Text style={styles.badgeEsperaText}>
                {caso.diasEnEspera} {caso.diasEnEspera === 1 ? 'día' : 'días'} en espera
              </Text>
              <MaterialIcons name="hourglass-top" size={16} color={colors.atencion} />
            </View>
          </View>
          <View style={styles.nameRow}>
            <View style={styles.nameInfo}>
              <View style={styles.nameLine}>
                <Text style={styles.nombre}>{caso.nombre}</Text>
                {caso.sexo && (
                  <MaterialIcons name={caso.sexo === 'macho' ? 'male' : 'female'} size={20} color="#ffb77d" />
                )}
              </View>
              {!!subtitulo && <Text style={styles.subtitulo}>{subtitulo}</Text>}
            </View>
            <Pressable
              style={styles.star}
              onPress={() => setFavorito((f) => !f)}
              accessibilityLabel={favorito ? 'Quitar de favoritos' : 'Marcar como favorito'}
            >
              <MaterialIcons name={favorito ? 'star' : 'star-border'} size={22} color="#fff" />
            </Pressable>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <View style={[styles.infoIcon, { backgroundColor: '#9cf2e8' }]}>
              <MaterialIcons name="calendar-today" size={20} color="#00201d" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Ingreso</Text>
              <Text style={styles.infoValue}>{caso.fechaIngreso ?? '—'}</Text>
            </View>
          </View>
          <View style={styles.infoCard}>
            <View style={[styles.infoIcon, { backgroundColor: colors.atencionBg }]}>
              <MaterialIcons name="location-on" size={20} color={colors.atencionText} />
            </View>
            <View style={[styles.infoText, { flex: 1 }]}>
              <Text style={styles.infoLabel}>Rescatado en</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{rescate.lugar}</Text>
              {!!rescate.barrio && <Text style={styles.infoSub}>{rescate.barrio}</Text>}
            </View>
          </View>
        </View>

        <View style={styles.actualCard}>
          <View style={[styles.infoIcon, { backgroundColor: caso.ubicacionTipo === 'veterinaria' ? '#ffd6d3' : '#cfe4e2' }]}>
            <MaterialIcons
              name={caso.ubicacionTipo === 'veterinaria' ? 'local-hospital' : 'home'}
              size={20}
              color={colors.primary}
            />
          </View>
          <View style={[styles.infoText, { flex: 1 }]}>
            <Text style={styles.infoLabel}>Ubicación actual</Text>
            <Text style={styles.infoValue}>{caso.ubicacion}</Text>
          </View>
        </View>

        <View style={styles.estadoSection}>
          <View style={styles.estadoHeader}>
            <Text style={styles.seccionTitulo}>Estado actual del caso</Text>
            <Pressable onPress={() => navigation?.navigate?.('CambioEstado', { casoId: caso.id })}>
              <Text style={styles.link}>Tocar para cambiar</Text>
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

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitulo}>
              <MaterialIcons name="favorite" size={22} color={colors.primary} />
              <Text style={styles.seccionTitulo}>Reseña sanitaria</Text>
            </View>
            {caso.resenaEnCurso && (
              <View style={styles.badgeCurso}>
                <Text style={styles.badgeCursoText}>En curso</Text>
                <MaterialIcons name="autorenew" size={13} color={colors.atencionText} />
              </View>
            )}
          </View>
          <View style={styles.notas}>
            <Text style={styles.notasText}>{caso.nota ?? 'Sin reseña sanitaria cargada.'}</Text>
          </View>
          {caso.veterinario && (
            <View style={styles.vetRow}>
              <View style={styles.vetInfo}>
                <View style={styles.vetIcon}>
                  <MaterialIcons name="local-hospital" size={20} color="#fff" />
                </View>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.vetNombre}>{caso.veterinario.nombre}</Text>
                  <Text style={styles.vetClinica}>{caso.veterinario.clinica}</Text>
                </View>
              </View>
              <Pressable
                style={styles.llamar}
                onPress={() => Linking.openURL(`tel:${caso.veterinario!.telefono}`)}
                accessibilityLabel="Llamar al veterinario"
              >
                <MaterialIcons name="call" size={20} color="#00201d" />
              </Pressable>
            </View>
          )}
        </View>

        {historial.length > 0 && (
          <View style={[styles.card, { gap: 16 }]}>
            <View>
              <View style={styles.cardTitulo}>
                <MaterialIcons name="history" size={22} color={colors.primary} />
                <Text style={styles.seccionTitulo}>Historial de turnos y eventos</Text>
              </View>
              <Text style={styles.cantidad}>
                {historial.length} {historial.length === 1 ? 'registro' : 'registros'}
              </Text>
            </View>
            <View>
              {historial.map((ev, i) => (
                <ItemHistorial key={i} evento={ev} color={COLOR_PUNTO[Math.min(i, 2)]} ultimo={i === historial.length - 1} />
              ))}
            </View>
          </View>
        )}

        <View style={styles.acciones}>
          <Pressable style={styles.btnTurno} onPress={() => navigation?.navigate?.('AgendarTurno', { casoId: caso.id })}>
            <Text style={styles.btnTurnoText}>Agendar turno veterinario</Text>
            <MaterialIcons name="event-available" size={22} color="#fff" />
          </Pressable>
          <Pressable style={styles.btnArchivar} onPress={() => navigation?.navigate?.('CerrarCaso', { casoId: caso.id })}>
            <Text style={styles.btnArchivarText}>Marcar como Adoptado / Archivar</Text>
            <MaterialIcons name="folder-special" size={20} color={colors.primary} />
          </Pressable>
        </View>
      </ScrollView>
      {aviso && (
        <View style={[styles.toast, { bottom: 24 + bottom }]} pointerEvents="none">
          <MaterialIcons name="check-circle" size={20} color={colors.toastIcon} />
          <Text style={styles.toastText}>Estado actualizado</Text>
        </View>
      )}
    </View>
  );
}

function ItemHistorial({ evento, color, ultimo }: { evento: EventoHistorial; color: string; ultimo: boolean }) {
  return (
    <View style={styles.itemRow}>
      <View style={styles.dotCol}>
        <View style={[styles.dot, { backgroundColor: color }]}>
          <View style={styles.dotInner} />
        </View>
        {!ultimo && <View style={styles.linea} />}
      </View>
      <View style={[styles.itemContenido, !ultimo && { paddingBottom: 20 }]}>
        {evento.confirmado ? (
          <View style={styles.itemCard}>
            <View style={styles.itemFechaRow}>
              <Text style={[styles.itemFecha, { color: colors.primary }]}>{evento.fecha}</Text>
              <View style={styles.badgeConfirmado}>
                <Text style={styles.badgeConfirmadoText}>Confirmado</Text>
                <MaterialIcons name="check" size={12} color={colors.aldiaText} />
              </View>
            </View>
            <Text style={styles.itemTitulo}>{evento.titulo}</Text>
            <Text style={styles.itemDetalle}>{evento.detalle}</Text>
          </View>
        ) : (
          <View style={styles.itemPlano}>
            <Text style={[styles.itemFecha, { color: colors.placeholderInput }]}>{evento.fecha}</Text>
            <Text style={styles.itemTitulo}>{evento.titulo}</Text>
            <Text style={styles.itemDetalle}>{evento.detalle}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  vacio: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textMuted },
  main: { padding: 16, paddingBottom: 32, gap: 16 },

  hero: { height: 288, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  heroImg: { width: '100%', height: '100%' },
  badgesRow: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badgeEspera: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.93)' },
  badgeEsperaText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  nameRow: { position: 'absolute', left: 16, right: 16, bottom: 12, height: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(13,28,26,0.8)' },
  nameInfo: { flex: 1, gap: 2 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nombre: { fontFamily: fonts.bold, fontSize: 26, color: '#fff' },
  subtitulo: { fontFamily: fonts.semibold, fontSize: 13, color: '#fff' },
  star: { width: 44, height: 44, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },

  infoGrid: { flexDirection: 'row', gap: 8 },
  infoCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: colors.surface },
  actualCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: colors.surface },
  infoIcon: { width: 40, height: 40, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  infoText: { gap: 2 },
  infoLabel: { fontFamily: fonts.bold, fontSize: 12, color: colors.placeholderInput },
  infoValue: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  infoSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.placeholderInput },

  estadoSection: { gap: 8 },
  estadoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seccionTitulo: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9999, backgroundColor: colors.surfaceChip },
  chipActivo: { backgroundColor: colors.primary },
  chipText: { fontFamily: fonts.semibold, fontSize: 13 },

  card: { padding: 16, gap: 12, borderRadius: 16, backgroundColor: colors.surface },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitulo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeCurso: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, backgroundColor: colors.atencionBg },
  badgeCursoText: { fontFamily: fonts.bold, fontSize: 13, color: colors.atencionText },
  notas: { padding: 14, borderRadius: 12, backgroundColor: colors.surfaceCard },
  notasText: { fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  vetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, backgroundColor: colors.surfaceMuted },
  vetInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  vetIcon: { width: 40, height: 40, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  vetNombre: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  vetClinica: { fontFamily: fonts.regular, fontSize: 13, color: colors.placeholderInput },
  llamar: { width: 44, height: 44, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#9cf2e8' },

  cantidad: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
  itemRow: { flexDirection: 'row', gap: 12 },
  dotCol: { width: 16, alignItems: 'center' },
  dot: { width: 16, height: 16, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  dotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  linea: { flex: 1, width: 2, backgroundColor: colors.border },
  itemContenido: { flex: 1 },
  itemCard: { gap: 6, padding: 12, borderRadius: 12, backgroundColor: colors.surfaceCard },
  itemPlano: { gap: 4, paddingVertical: 4 },
  itemFechaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemFecha: { fontFamily: fonts.bold, fontSize: 13 },
  itemTitulo: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  itemDetalle: { fontFamily: fonts.regular, fontSize: 13, color: colors.placeholderInput },
  badgeConfirmado: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, backgroundColor: colors.toastIcon },
  badgeConfirmadoText: { fontFamily: fonts.bold, fontSize: 13, color: colors.aldiaText },

  toast: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 9999, backgroundColor: colors.toast },
  toastText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.toastText },
  acciones: { gap: 8 },
  btnTurno: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 9999, backgroundColor: colors.brand },
  btnTurnoText: { fontFamily: fonts.semibold, fontSize: 15, color: '#fff' },
  btnArchivar: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 9999, backgroundColor: colors.surfaceChip },
  btnArchivarText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
});
