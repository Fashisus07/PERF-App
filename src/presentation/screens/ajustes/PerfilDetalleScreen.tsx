import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authRepository } from '../../../di/container';
import { esAdministrador, ETIQUETA_ROL, sigueElCaso, Voluntario, zonasDesdeTexto } from '../../../domain/models/Ajustes';
import { AvatarIniciales } from '../../components/AvatarIniciales';
import { StackHeader } from '../../components/StackHeader';
import { useCasoStore } from '../../stores/useCasoStore';
import { colors, fonts } from '../../theme';
import { notificarCambioVoluntario } from '../rescate/BarraRescate';

const VERSION: string = require('../../../../app.json').expo.version;

type Props = { navigation?: any; route?: { params?: { voluntarioId?: string } } };

const ETIQUETA_RECURSO: Record<string, string> = {
  canil: 'Canil / Transportadora',
  movil: 'Vehículo para traslados',
  transito: 'Espacio de tránsito temporal',
  trampa: 'Jaula trampa (captura)',
  botiquin: 'Botiquín de primeros auxilios',
};

/** Vista de solo lectura del perfil de un voluntario: contacto, zonas, recursos y los casos que sigue. */
export function PerfilDetalleScreen({ navigation, route }: Props) {
  const { bottom } = useSafeAreaInsets();
  const voluntarioId = route?.params?.voluntarioId;
  const [voluntario, setVoluntario] = useState<Voluntario | null>(null);
  const [esMiPerfil, setEsMiPerfil] = useState(false);
  const [cargando, setCargando] = useState(true);
  const casos = useCasoStore((s) => s.casos);
  const cargarCasos = useCasoStore((s) => s.cargarCasos);

  useEffect(() => {
    (async () => {
      const [actual, elegido] = await Promise.all([
        authRepository.obtenerVoluntarioActual(),
        voluntarioId ? authRepository.obtenerVoluntario(voluntarioId) : Promise.resolve(null),
      ]);
      const mostrado = elegido ?? actual;
      setVoluntario(mostrado);
      setEsMiPerfil(!!mostrado && !!actual && mostrado.id === actual.id);
      if (casos.length === 0) await cargarCasos(undefined, true);
    })()
      .catch(() => setVoluntario(null))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voluntarioId]);

  const cerrarSesion = async () => {
    await authRepository.cerrarSesion();
    notificarCambioVoluntario('');
    navigation?.reset?.({ index: 0, routes: [{ name: 'Login' }] });
  };

  const susCasos = useMemo(
    () => (voluntario ? casos.filter((c) => sigueElCaso(c.quienSigueCaso, voluntario)) : []),
    [casos, voluntario]
  );

  if (cargando) {
    return (
      <View style={styles.screen}>
        <StackHeader titulo="Perfil" onBack={() => navigation?.goBack?.()} />
        <View style={styles.centro}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  if (!voluntario) {
    return (
      <View style={styles.screen}>
        <StackHeader titulo="Perfil" onBack={() => navigation?.goBack?.()} />
        <View style={styles.centro}>
          <Text style={styles.muted}>No se encontró este perfil.</Text>
        </View>
      </View>
    );
  }

  const rol = voluntario.rol ?? 'voluntario';
  const zonas = zonasDesdeTexto(voluntario.zona);
  const recursos = voluntario.recursos ?? [];

  return (
    <View style={styles.screen}>
      <StackHeader
        titulo={esMiPerfil ? 'Mi perfil' : 'Perfil'}
        onBack={() => navigation?.goBack?.()}
        derecha={
          esMiPerfil ? (
            <Pressable onPress={() => navigation?.navigate?.('PerfilVoluntario')} accessibilityLabel="Editar mi perfil">
              <MaterialIcons name="edit" size={22} color={colors.primary} />
            </Pressable>
          ) : undefined
        }
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom + 32 }]}>
        <View style={styles.card}>
          <View style={styles.cabecera}>
            <AvatarIniciales nombre={voluntario.nombre} rol={rol} tamano={64} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.nombre}>{voluntario.nombre || 'Sin nombre'}</Text>
              <View style={styles.badges}>
                <View style={[styles.badge, esAdministrador(rol) && styles.badgeAdmin]}>
                  <MaterialIcons
                    name={esAdministrador(rol) ? 'admin-panel-settings' : 'volunteer-activism'}
                    size={14}
                    color={esAdministrador(rol) ? colors.onPrimary : colors.primary}
                  />
                  <Text style={[styles.badgeTexto, esAdministrador(rol) && { color: colors.onPrimary }]}>
                    {ETIQUETA_ROL[rol]}
                  </Text>
                </View>
                {voluntario.brigada ? <Text style={styles.muted}>{voluntario.brigada}</Text> : null}
              </View>
            </View>
          </View>
        </View>

        <Seccion icono="contact-phone" titulo="Contacto">
          <Dato icono="mail-outline" texto={voluntario.email || 'Sin correo'} />
          {voluntario.telefono ? (
            <Pressable onPress={() => Linking.openURL(`tel:${voluntario.telefono}`)} accessibilityLabel="Llamar">
              <Dato icono="smartphone" texto={voluntario.telefono} accion />
            </Pressable>
          ) : (
            <Dato icono="smartphone" texto="Sin teléfono" />
          )}
        </Seccion>

        <Seccion icono="location-on" titulo="Zonas que cubre">
          {zonas.length ? (
            <View style={styles.chips}>
              {zonas.map((z) => (
                <View key={z} style={styles.chip}>
                  <Text style={styles.chipTexto}>{z}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>Todavía no cargó sus zonas.</Text>
          )}
        </Seccion>

        <Seccion icono="inventory-2" titulo="Recursos">
          {recursos.length ? (
            recursos.map((r) => <Dato key={r} icono="check-circle" texto={ETIQUETA_RECURSO[r] ?? r} />)
          ) : (
            <Text style={styles.muted}>Sin recursos informados.</Text>
          )}
        </Seccion>

        {esMiPerfil && (
          <View style={styles.acciones}>
            <Pressable
              style={styles.botonPrincipal}
              onPress={() => navigation?.navigate?.('PerfilVoluntario')}
              accessibilityLabel="Editar mi perfil"
            >
              <MaterialIcons name="edit" size={20} color={colors.onPrimary} />
              <Text style={styles.botonPrincipalTexto}>Editar mi perfil</Text>
            </Pressable>
            <Pressable
              style={styles.filaAccion}
              onPress={() => navigation?.navigate?.('Perfiles')}
              accessibilityLabel="Ver perfiles de voluntarios"
            >
              <MaterialIcons name="groups" size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.filaAccionTitulo}>Perfiles de voluntarios</Text>
                <Text style={styles.muted}>Quiénes son, qué zonas cubren y qué casos siguen</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.textSubtle} />
            </Pressable>
            <Pressable style={styles.cerrar} onPress={cerrarSesion} accessibilityLabel="Cerrar sesión">
              <MaterialIcons name="logout" size={18} color={colors.urgente} />
              <Text style={styles.cerrarTexto}>Cerrar sesión o cambiar voluntario</Text>
            </Pressable>
            <Text style={styles.version}>PERF Móvil · Versión {VERSION}</Text>
          </View>
        )}

        {!esMiPerfil && (
          <Seccion icono="pets" titulo={`Casos que sigue (${susCasos.length})`}>
            {susCasos.length ? (
              susCasos.map((c) => (
                <Pressable
                  key={c.id}
                  style={styles.caso}
                  onPress={() => navigation?.navigate?.('DetalleCaso', { casoId: c.id })}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.casoNombre} numberOfLines={1}>{c.nombreProvisorio}</Text>
                    <Text style={styles.muted}>{c.barrio}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={colors.textSubtle} />
                </Pressable>
              ))
            ) : (
              <Text style={styles.muted}>No tiene casos asignados.</Text>
            )}
          </Seccion>
        )}
      </ScrollView>
    </View>
  );
}

function Seccion({
  icono,
  titulo,
  children,
}: {
  icono: keyof typeof MaterialIcons.glyphMap;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.seccionHeader}>
        <MaterialIcons name={icono} size={20} color={colors.primary} />
        <Text style={styles.seccionTitulo}>{titulo}</Text>
      </View>
      {children}
    </View>
  );
}

function Dato({ icono, texto, accion }: { icono: keyof typeof MaterialIcons.glyphMap; texto: string; accion?: boolean }) {
  return (
    <View style={styles.dato}>
      <MaterialIcons name={icono} size={18} color={colors.textMuted} />
      <Text style={[styles.datoTexto, accion && { color: colors.primary, fontFamily: fonts.semibold }]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  nombre: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceChip,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeAdmin: { backgroundColor: colors.primary },
  badgeTexto: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primary },
  seccionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seccionTitulo: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  dato: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 28 },
  datoTexto: { fontFamily: fonts.regular, fontSize: 14, color: colors.text, flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 },
  chipTexto: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  caso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 12,
    minHeight: 56,
  },
  casoNombre: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  acciones: { gap: 12 },
  botonPrincipal: {
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  botonPrincipalTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.onPrimary },
  filaAccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    minHeight: 64,
  },
  filaAccionTitulo: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  cerrar: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: colors.urgenteBg,
  },
  cerrarTexto: { fontFamily: fonts.semibold, fontSize: 14, color: colors.urgenteText },
  version: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSubtle, textAlign: 'center' },
});
