import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Clinica, horaDe, Turno } from '../../domain/models/Turno';
import { RecordatorioTurnos } from '../../domain/services/RecordatorioTurnos';

const CANAL = 'turnos';
export const CATEGORIA = 'turno';
export const ACCION_LLAMAR = 'llamar';

export async function configurarNotificaciones() {
  if (Platform.OS === 'web') return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CANAL, {
        name: 'Turnos veterinarios',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    await Notifications.setNotificationCategoryAsync(CATEGORIA, [
      { identifier: 'ver', buttonTitle: 'Ver en la app', options: { opensAppToForeground: true } },
      { identifier: ACCION_LLAMAR, buttonTitle: 'Llamar al centro', options: { opensAppToForeground: true } },
    ]);
  } catch (err) {
    console.warn('No se pudo inicializar las notificaciones:', err);
  }
}

async function pedirPermiso() {
  if (Platform.OS === 'web') return false;
  try {
    const actual = await Notifications.getPermissionsAsync();
    if (actual.granted) return true;
    if (!actual.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export class RecordatoriosNotificaciones implements RecordatorioTurnos {
  async programar(turno: Turno, clinica?: Clinica, nombreCaso?: string): Promise<boolean> {
    try {
      if (!(await pedirPermiso())) return false;
      const ahora = Date.now();
      const msAnticipacion = (turno.recordatorioMinutos || 120) * 60 * 1000;
      const momentoDisparo = turno.fechaHora - msAnticipacion;

      if (momentoDisparo <= ahora) {
        return false; // el momento del recordatorio ya transcurrió
      }

      const fechaCita = new Date(turno.fechaHora);
      const clinicaNombre = clinica?.nombre || 'Centro Veterinario';
      const animal = nombreCaso || 'Animal rescatado';

      await Notifications.scheduleNotificationAsync({
        identifier: `${turno.id}-recordatorio`,
        content: {
          title: `Recordatorio de turno: ${animal}`,
          subtitle: clinicaNombre,
          body: `Cita a las ${horaDe(fechaCita)} hs en ${clinicaNombre}. Motivo: ${turno.motivo}.`,
          categoryIdentifier: CATEGORIA,
          data: { turnoId: turno.id, telefono: clinica?.telefono },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(momentoDisparo),
          channelId: CANAL,
        },
      });

      return true;
    } catch {
      return false;
    }
  }

  async cancelar(turnoId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(`${turnoId}-recordatorio`);
    } catch {}
  }
}
