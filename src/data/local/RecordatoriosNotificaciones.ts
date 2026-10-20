import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AvisoTurno, Clinica, horaDe, MS_AVISO, Turno } from '../../domain/models/Turno';
import { RecordatorioTurnos } from '../../domain/services/RecordatorioTurnos';

const CANAL = 'turnos';
export const CATEGORIA = 'turno';
export const ACCION_LLAMAR = 'llamar';

// Se llama una vez al iniciar la app: cómo se muestran las notificaciones y qué botones llevan.
export async function configurarNotificaciones() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
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
}

async function pedirPermiso() {
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return true;
  if (!actual.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

// Programa los avisos en el teléfono: funcionan sin conexión porque los dispara el sistema.
export class RecordatoriosNotificaciones implements RecordatorioTurnos {
  async programar(turno: Turno, clinica: Clinica, nombreCaso: string): Promise<AvisoTurno[]> {
    const programados: AvisoTurno[] = [];
    try {
      if (!(await pedirPermiso())) return [];
      const ahora = Date.now();
      for (const aviso of turno.avisos) {
        const cuando = new Date(turno.fecha.getTime() - MS_AVISO[aviso]);
        if (cuando.getTime() <= ahora) continue; // ese aviso ya pasó
        // El aviso de 1 día antes suena el día anterior ("mañana"); el de 2 horas, el mismo día ("hoy").
        const dia = aviso === '1dia' ? 'mañana' : 'hoy';
        await Notifications.scheduleNotificationAsync({
          identifier: `${turno.id}-${aviso}`,
          content: {
            title: `Turno ${dia} ${horaDe(turno.fecha)} — ${nombreCaso}`,
            subtitle: clinica.nombre,
            body: `${turno.titulo}. Recordá verificar el canil de transporte y el ayuno previo si corresponde.`,
            categoryIdentifier: CATEGORIA,
            data: { turnoId: turno.id, telefono: clinica.telefono },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: cuando, channelId: CANAL },
        });
        programados.push(aviso);
      }
      return programados;
    } catch {
      return programados;
    }
  }

  async cancelar(turnoId: string): Promise<void> {
    for (const aviso of ['1dia', '2horas']) {
      await Notifications.cancelScheduledNotificationAsync(`${turnoId}-${aviso}`).catch(() => {});
    }
  }
}
