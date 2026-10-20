# PERF Móvil

App Android para voluntarios de rescate animal: registra y sigue casos en la calle, **incluso sin conexión**.

- **Materia:** Desarrollo de Aplicaciones I (Aula 548, turno noche)
- **Stack:** React Native + Expo + TypeScript
- **Diseño:** Figma "TPO - Perf App"
- **Equipo:** Mateo Mirarchi, Facundo Pérez Espinosa, Tobías

## Problema

Los voluntarios de los refugios que rescatan animales en la calle pierden la información de cada caso: la registran en chats, planillas o de memoria. Los casos urgentes se pierden entre mensajes, los datos se duplican, los turnos veterinarios se olvidan y no hay un historial confiable al momento de la adopción.

## Solución

Una app móvil que permite:

- Registrar un rescate en pocos pasos (foto, datos del animal, ubicación).
- Ver los casos ordenados por urgencia.
- Agendar turnos veterinarios con recordatorio.
- Cerrar un caso como adoptado y consultarlo en el Archivo.
- Funcionar sin conexión y sincronizar al recuperar la señal (Offline First).

## Alcance de la v1

**Incluye**

- Registro de rescate en 3 pasos con ubicación.
- Lista de casos con prioridad por urgencia, búsqueda y filtros.
- Detalle de caso con reseña sanitaria e historial.
- Agenda de turnos veterinarios con recordatorio local.
- Cierre de caso como adoptado y vista de Archivo.
- Persistencia local y sincronización automática.
- Estados de carga, vacío, error y sin conexión.
- Ajustes mínimos: sincronización manual y recordatorios.

**No incluye**

- Autenticación real y roles (la sesión es simulada).
- Notificaciones push remotas.
- Mapa interactivo embebido.
- Chat entre voluntarios.
- Versión iOS y panel web.

## Requisitos funcionales

| ID | Requisito |
|----|-----------|
| RF01 | Registrar un rescate en tres pasos (foto, datos, confirmación). Con el dispositivo sin conexión el caso queda guardado y marcado como pendiente de sincronizar. |
| RF02 | Consultar y priorizar casos: lista ordenada por urgencia, búsqueda por nombre y detalle con historial. |
| RF03 | Agendar un turno veterinario con recordatorio local, aun sin conexión. |
| RF04 | Cerrar un caso como adoptado con confirmación explícita; pasa al Archivo y se cancelan sus turnos pendientes. |

## Arquitectura

Tres capas. Una acción baja de la pantalla al caso de uso y llega al repositorio, que escribe primero en la base local y después sincroniza con la API.

```
src/
  presentation/   UI, estado de pantalla y navegación
    theme/          colores y tipografías del Figma
    components/     componentes reutilizables (CasoCard, AppHeader, ...)
    hooks/          estado y lógica por pantalla (useCasos, ...)
    navigation/     barra inferior y flujos
    screens/        casos, detalle, rescate, turnos, archivo, ajustes
  domain/         reglas de negocio, sin depender de la UI ni del dispositivo
    models/         Caso, Turno, Evento
    usecases/       ListarCasosPorUrgencia, RegistrarRescate, AgendarTurno, CerrarCasoComoAdoptado
    repositories/   interfaces
  data/           acceso a datos
    repositories/   implementaciones de las interfaces del dominio
    local/          SQLite
    remote/         cliente de la API
    mappers/        filas de base <-> modelos de dominio
    mock/           datos de ejemplo
assets/           logo, imágenes e íconos
```

## Tecnologías

| Tecnología | Para qué se usa |
|------------|-----------------|
| React Native + Expo + TypeScript | Interfaz y lógica de la app, con tipado para mantener las capas separadas. |
| React Navigation | Barra inferior de pestañas y flujo de rescate en pasos. |
| Hooks + Zustand | Estado de pantalla y lógica de presentación. |
| expo-sqlite | Base local de casos, turnos e historial. |
| AsyncStorage | Preferencias simples (clave-valor): ajustes de urgencia y recordatorios. |
| Supabase (propuesto) | Base remota y almacenamiento de fotos. |
| expo-camera | Foto del animal en el momento del rescate (visor en vivo, flash y cámara frontal). |
| expo-image-picker | Elegir una foto de la galería como alternativa a la cámara. |
| expo-location | Ubicación puntual del rescate (una lectura, cuida la batería) y conversión de coordenadas a dirección. |
| expo-notifications | Recordatorios locales de turnos, sin conexión. |
| NetInfo | Detectar la conexión y disparar la sincronización. |
| Jest + React Native Testing Library | Tests de dominio y de pantallas. |

## Cámara y ubicación en el rescate

Las dos capacidades del dispositivo se usan en el flujo **Nuevo rescate** (`src/presentation/screens/rescate/`).

### Cámara (paso 1)

- **Librerías:** `expo-camera` para el visor y la captura, y `expo-image-picker` para elegir una foto de la galería. Se instalaron con `npx expo install`, que elige las versiones compatibles con el SDK de Expo del proyecto.
- **Cómo funciona:** `PasoFoto.tsx` muestra un `CameraView` con flash (auto, encendido, apagado), cambio de cámara frontal/trasera y una guía de encuadre. Al tocar el disparador se llama a `takePictureAsync` y la foto queda guardada como archivo local en el teléfono; el borrador del rescate guarda solo su ruta (`fotoUri`), no la imagen.
- **Permisos:** `useCameraPermissions()` pide el permiso de cámara en pantalla. Si el usuario lo rechaza, se muestra una explicación y se puede elegir una foto de la galería o seguir con "Omitir foto por urgencia".
- **Configuración:** los textos de los permisos están en `app.json`, en la sección `plugins`. El permiso de micrófono se bloquea a propósito (`recordAudioAndroid: false` en `expo-camera` y `microphonePermission: false` en `expo-image-picker`) porque la app no graba audio ni video; ambas librerías lo piden por defecto.

### Ubicación / GPS (paso 2)

- **Librería:** `expo-location`.
- **Cómo funciona:** el hook `useUbicacion` pide el permiso, lee la última posición conocida (instantánea) y, si no hay, pide una nueva con un límite de 15 segundos para que la pantalla nunca quede esperando. Después convierte las coordenadas en una dirección legible con `reverseGeocodeAsync` ("Barrio, Calle 123").
- **Sin permiso o sin GPS:** se avisa y el voluntario puede escribir el lugar a mano. Esto es importante en la calle y sin señal.
- **Qué se guarda:** el barrio y la calle, más las coordenadas (`lat`, `lng`) en el borrador del rescate.

### Dónde está cada cosa

| Archivo | Responsabilidad |
|---------|-----------------|
| `screens/rescate/PasoFoto.tsx` | Visor de cámara, captura, galería y permiso |
| `screens/rescate/PasoDatos.tsx` | Formulario de datos y botón "Usar mi ubicación" |
| `hooks/useUbicacion.ts` | Permiso, lectura del GPS y dirección |
| `domain/models/Rescate.ts` | Datos del borrador y cálculo de urgencia por triaje |
| `domain/usecases/RegistrarRescate.ts` | Validación y registro del caso (sin depender del dispositivo) |

La capa de dominio no conoce la cámara ni el GPS: recibe la ruta de la foto y las coordenadas ya resueltas. Así las reglas se pueden probar sin dispositivo.

### Probarlo en el emulador

- **Cámara:** el emulador de Android usa una cámara virtual, por lo que la foto puede salir negra con la fecha. En un teléfono real se ve normal.
- **GPS:** se puede fijar una posición desde Android Studio (Extended controls > Location) o con `adb emu geo fix <longitud> <latitud>` (por ejemplo `adb emu geo fix -58.4106 -34.6094` para Balvanera).

## Turnos y recordatorios locales

La agenda y el flujo de agendar están en `src/presentation/screens/turnos/`. Los recordatorios usan `expo-notifications` y **funcionan sin conexión**, porque los dispara el sistema operativo desde una alarma programada en el teléfono.

- **Cómo funciona:** al confirmar un turno, el caso de uso `AgendarTurno` guarda el turno y le pide a un servicio de recordatorios que programe los avisos elegidos (1 día antes y/o 2 horas antes). Cada aviso se programa con `scheduleNotificationAsync` con un disparador por fecha (`DATE`).
- **Permiso:** la app pide el permiso de notificaciones la primera vez que se agenda un turno. Si se rechaza, el turno se guarda igual y la confirmación avisa que no hay recordatorios.
- **Avisos que ya pasaron:** si un aviso cae en un momento anterior a ahora (por ejemplo, "1 día antes" de un turno de mañana a la tarde), no se programa. La pantalla de confirmación muestra solo los que quedaron activos.
- **Botones de la notificación:** "Llamar al centro" abre el teléfono con el número de la clínica (se maneja en `App.tsx`). "Ver en la app", al igual que tocar la notificación, **por ahora solo abre la aplicación**, sin llevar a una pantalla en particular.
- **Pendiente (limitación conocida):** tocar la notificación debería llevar directo al turno (la pestaña Turnos). El id del turno ya viaja dentro de la notificación (`data.turnoId`), pero falta navegar al recibirlo. Si la app estaba cerrada, también hay que resolver el paso por el Login, porque la sesión es simulada.
- **Cupo no disponible:** si el horario elegido ya está reservado en la clínica, `AgendarTurno` lanza `CupoNoDisponible` con los dos próximos horarios libres. La pantalla de error los ofrece para reservar con un toque, sin volver a cargar los datos.

| Archivo | Responsabilidad |
|---------|-----------------|
| `domain/usecases/AgendarTurno.ts` | Reglas: horario futuro, cupo libre y alternativas |
| `domain/services/RecordatorioTurnos.ts` | Interfaz de los recordatorios (el dominio no conoce `expo-notifications`) |
| `data/local/RecordatoriosNotificaciones.ts` | Implementación con `expo-notifications` |
| `data/repositories/TurnoRepositoryImpl.ts` | Turnos en memoria (pendiente reemplazar por SQLite) |
| `screens/turnos/` | Agenda, formulario, confirmación y error de cupo |

Para verificar los avisos en el emulador: `adb shell dumpsys alarm | grep PERFtmp` lista las alarmas programadas por la app.

## Ajustes

Se abre desde el engranaje del encabezado de las pantallas principales (`src/presentation/screens/ajustes/`). Las preferencias se guardan en el teléfono con **AsyncStorage** (`@react-native-async-storage/async-storage`), que es la opción simple para pares clave-valor; los casos y turnos irán en SQLite.

| Ajuste | Qué hace realmente |
|--------|--------------------|
| Días para marcar como urgente | Cambia la urgencia de los casos: uno con más días de espera que el umbral se muestra como urgente en la lista y en el detalle. Solo sube la urgencia, nunca la baja. La regla está en `conUmbral` (dominio). Rango 1 a 30 días, validado en `GuardarAjustes`. |
| Recordatorio anticipado / Alerta de salida | Definen qué recordatorios vienen marcados al agendar un turno (1 día antes y 2 horas antes). |
| Forzar sincronización ahora | Llama a `SincronizarAhora`: sin conexión no intenta y avisa; con conexión envía los casos pendientes. |
| Espacio en memoria local | Resumen de casos activos y archivados. |
| Cerrar sesión | Vuelve al Login (la sesión es simulada). |

Limitaciones actuales, para no confundirlas con funciones terminadas:

- El **modo offline automático** se guarda, pero todavía no cambia el comportamiento: la app ya trabaja siempre con datos locales y no hay base SQLite ni API reales.
- El **espacio en memoria** y los **casos archivados** son estimados con datos de ejemplo, no una medición real.
- La **sincronización** es simulada hasta que exista la API (`TODO` de Mateo en `CasoRepositoryImpl`).
- El **voluntario** de la sesión ("Mariana Gomez · Brigada Caballito") es un dato fijo de ejemplo.
- La **versión** que se muestra es la real de `app.json`; el Figma muestra una de ejemplo.

## Estrategia Offline First

La app siempre lee y escribe primero en la base local; la red solo sincroniza en segundo plano.

| Situación | Qué hace la app |
|-----------|-----------------|
| Con conexión | Muestra datos locales, los actualiza desde el servidor y envía las operaciones pendientes. |
| Sin conexión | Sigue funcionando con la base local. Cada cambio queda como operación pendiente. |
| Recupera conexión | Envía las pendientes en orden y descarga novedades. |
| Sin datos locales | Pide conexión para la primera descarga; si falla, ofrece reintentar. |

Ante un conflicto de edición prevalece la modificación más reciente. El cierre por adopción nunca se revierte.

## Estado actual

- [x] Proyecto Expo + TypeScript con estructura por capas.
- [x] Tema (colores y tipografía Plus Jakarta Sans) tomado del Figma.
- [x] Logo, ícono de la app y splash.
- [x] Navegación inferior: Casos, Turnos, Archivo.
- [x] Pantalla **Casos**: resumen de urgentes, búsqueda, filtros por urgencia y lista (datos de ejemplo).
- [x] Pantalla **Detalle del caso**: ficha, ubicación actual y de rescate, estado, reseña sanitaria e historial.
- [x] **Cambio de estado** con confirmación (motivo obligatorio; destino obligatorio al derivar a tránsito o clínica).
- [x] **Nuevo rescate** en 3 pasos, con confirmación y pantalla de error al guardar (datos de ejemplo en memoria).
- [ ] Cierre por adopción.
- [x] **Turnos**: agenda, agendar turno, confirmación y aviso de cupo no disponible (datos de ejemplo en memoria).
- [ ] Archivo de casos.
- [x] **Ajustes** (umbral de urgencia, recordatorios y sincronización; ver sus limitaciones en la sección *Ajustes*).
- [ ] Estados de carga, vacío, error y sin conexión.
- [ ] SQLite, sincronización y Supabase.
- [x] Cámara y ubicación (ver la sección *Cámara y ubicación en el rescate*).
- [x] Notificaciones locales de turnos (ver la sección *Turnos y recordatorios locales*).
- [ ] Tests.

## Cómo correrla

Requisitos: Node.js 20 o superior y un emulador de Android (Android Studio) o un celular con Expo Go.

```bash
npm install
npx expo start
```

Con el emulador abierto, presionar `a` en la terminal. Con un celular, escanear el QR con Expo Go.

Si se agregaron librerías nativas (como la cámara) o se cambió `app.json`, hay que volver a compilar la app para que tome los permisos:

```bash
npm install
npx expo run:android
```

Este comando genera la carpeta `android/` (no se sube al repositorio) y la instala en el emulador. Necesita JDK 21; con el JDK 25 que trae Android Studio falla la compilación nativa.

Verificar tipos:

```bash
npx tsc --noEmit
```

## Roles

| Integrante | Rol principal |
|------------|---------------|
| Mateo | Arquitectura, datos y sincronización |
| Facundo | UI, UX y navegación |
| Tobías | Capacidades del dispositivo, testing y documentación |

Todos participan en todo el proyecto y deben poder explicar la app completa.
