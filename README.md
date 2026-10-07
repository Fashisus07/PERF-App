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
| AsyncStorage | Preferencias simples (clave-valor). |
| Supabase (propuesto) | Base remota y almacenamiento de fotos. |
| expo-camera | Foto del animal en el momento del rescate. |
| expo-location | Ubicación puntual del rescate (una lectura, cuida la batería). |
| expo-notifications | Recordatorios locales de turnos, sin conexión. |
| NetInfo | Detectar la conexión y disparar la sincronización. |
| Jest + React Native Testing Library | Tests de dominio y de pantallas. |

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
- [ ] Detalle del caso y cierre por adopción.
- [ ] Nuevo rescate (3 pasos).
- [ ] Turnos y agendar turno.
- [ ] Archivo de casos.
- [ ] Ajustes.
- [ ] Estados de carga, vacío, error y sin conexión.
- [ ] SQLite, sincronización y Supabase.
- [ ] Cámara, ubicación y notificaciones locales.
- [ ] Tests.

## Cómo correrla

Requisitos: Node.js 20 o superior y un emulador de Android (Android Studio) o un celular con Expo Go.

```bash
npm install
npx expo start
```

Con el emulador abierto, presionar `a` en la terminal. Con un celular, escanear el QR con Expo Go.

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
