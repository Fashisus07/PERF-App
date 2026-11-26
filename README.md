# PERF Móvil 🐾

> **Aplicación móvil para la gestión de rescates de animales, seguimiento de casos clínicos y turnos veterinarios con soporte Offline First.**

Desarrollada para los voluntarios de refugios y redes de rescate animal en la vía pública (foco en felinos). Permite registrar rescates en el momento, gestionar el historial sanitario, coordinar hogares de tránsito o atención veterinaria, y mantener la continuidad operativa **incluso en zonas sin cobertura de red**.

---

## 📌 Datos del Proyecto

- **Materia:** Desarrollo de Aplicaciones I (UADE - Aula 548, Turno Noche)
- **Año / Cuatrimestre:** 2026 - 2do Cuatrimestre
- **Stack Principal:** React Native 0.86 + Expo SDK 57 + TypeScript 6.0
- **Diseño UI/UX:** Prototipo Figma *"TPO - Perf App"*
- **Integrantes del Equipo:**
  - **Mateo Mirarchi:** Arquitectura, capa de datos, base de datos SQLite y sincronización offline.
  - **Facundo Pérez Espinosa:** Diseño UI/UX, componentes visuales, stores y flujo de navegación.
  - **Tobías:** Capacidades nativas de hardware (cámara, geolocalización, notificaciones locales) y documentación.

---

## 💡 Problema y Solución

### El Problema
Los voluntarios que realizan rescates en la calle enfrentan múltiples dificultades:
- Información dispersa en grupos de mensajería (WhatsApp, Telegram), planillas de cálculo y anotaciones sueltas.
- Dificultad para priorizar casos urgentes que requieren atención veterinaria inmediata.
- Pérdida u olvido de turnos médicos y controles de medicación.
- Falta de un historial sanitario consolidado al momento de dar un animal en adopción.
- Pérdida de datos por falta de señal o conexión de datos móviles durante los operativos de rescate.

### La Solución
**PERF Móvil** proporciona una herramienta centralizada y robusta:
- **Flujo de Rescate Guiado en 3 Pasos:** Captura fotográfica con visor de cámara, geolocalización GPS automática con geocodificación inversa, y evaluación clínica mediante triaje multicriterio (`gravedad_clinica` y `vulnerabilidad`).
- **Priorización Inteligente Multicriterio:** Clasificación determinística (`URGENTE`, `ATENCION`, `AL_DIA`) combinando gravedad clínica inmediata (crítico, lactante sin madre, sin tránsito) con umbral configurable de días en espera (`@perf_urgency_threshold_days`), visualizado con chips accesibles de mínimo 48dp y badges con motivo textual ("URGENTE • Crítico", "URGENTE • +16 días").
- **Seguimiento Clínico e Historial:** Ficha completa de cada animal (estado de castración, test VIF/ViLeF, desparasitaciones) y línea de tiempo de eventos inmutables (*append-only*).
- **Agenda Veterinaria y Notificaciones Locales:** Reserva de turnos con validación de cupos y programación de alarmas locales en Android (`AndroidImportance.MAX`, sonido y vibración) con cancelación reactiva (`notification_id`) al cumplirse o cerrarse el caso.
- **Arquitectura Offline First Bidireccional:** Persistencia local inmediata en SQLite (`perf.db`), generación de IDs con UUID v4 en el cliente, encolado de mutaciones con `idempotency_key`, sincronización bidireccional por fusión de deltas (*field-level merge*) y subida de fotos en dos fases a almacenamiento privado.

---

## 📐 Arquitectura del Software

El proyecto implementa los principios de **Clean Architecture** (Arquitectura Limpia) con separación en capas desacopladas, complementada con un patrón **Offline First** y gestión de dependencias centralizada.

```
                           ┌──────────────────────────────┐
                           │    Capa de Presentación      │
                           │  Screens, Hooks, Components  │
                           └──────────────┬───────────────┘
                                          │ usa
                                          ▼
                           ┌──────────────────────────────┐
                           │       Capa de Dominio        │
                           │   Models, UseCases, Ports    │
                           └──────────────▲───────────────┘
                                          │ implementa
                                          │
                           ┌──────────────┴───────────────┐
                           │        Capa de Datos         │
                           │  SQLite, Storage, Mappers    │
                           └──────────────────────────────┘
```

### Estructura de Directorios

```
PERF-App/
├── App.tsx                     # Punto de entrada, fuentes, notificaciones y SafeArea
├── app.json                    # Manifiesto de Expo, plugins nativos y permisos
├── index.ts                    # Registro raíz de Expo
├── package.json                # Dependencias y scripts de ejecución
├── tsconfig.json               # Configuración estricta de TypeScript
├── assets/                     # Recursos gráficos (iconos, splash, imágenes mock)
└── src/
    ├── di/                     # Inyección de dependencias
    │   └── container.ts        # Contenedor de singletons (repositorios, servicios, usecases)
    ├── domain/                 # Lógica de negocio pura (independiente de UI y frameworks)
    │   ├── models/             # Entidades de dominio (Caso, Turno, Rescate, Ajustes, etc.)
    │   ├── repositories/       # Interfaces de repositorios (contratos)
    │   ├── services/           # Interfaces de servicios de dominio (RecordatorioTurnos)
    │   └── usecases/           # Casos de uso de la aplicación
    ├── data/                   # Acceso y persistencia de datos
    │   ├── local/              # Base SQLite (Database.ts), Storage y notificaciones
    │   ├── mappers/            # Traductores DB Row <-> Modelo de Dominio
    │   ├── mock/               # Datos iniciales para seeding y desarrollo
    │   ├── remote/             # Clientes de API remota (preparado para Supabase/REST)
    │   └── repositories/       # Implementaciones concretas de los repositorios
    └── presentation/           # Capa visual y de interacción
        ├── components/         # Componentes UI reutilizables
        ├── hooks/              # Custom Hooks para pantallas y estados locales
        ├── navigation/         # Configuración de React Navigation (Tabs y Stacks)
        ├── screens/            # Vistas agrupadas por módulos funcionales
        ├── stores/             # Estado global reactivo con Zustand
        └── theme/              # Tokens de diseño (paleta de colores y tipografía)
```

---

## 🗄️ Estrategia Offline First y Persistencia

1. **Base de Datos SQLite Local (`expo-sqlite`):**
   - Base de datos relacional local en archivo `perf.db` con `PRAGMA journal_mode = WAL;` y `PRAGMA foreign_keys = ON;`.
   - **Tablas y Columnas Clave:**
     - `casos`: almacena la información integral del felino.
       - Identificación: `id` (UUID v4 generado en el cliente).
       - Datos básicos: `nombre_provisorio`, `especie`, `cantidad_animales`, `edad_estimada`, `estado_general`, `temperamento`.
       - Multicriterio de Urgencia: `gravedad_clinica` (`CRITICA` | `MODERADA` | `LEVE` | `SANA`), `vulnerabilidad` (`LACTANTE_SIN_MADRE` | `SIN_TRANSITO` | `EN_TRATAMIENTO` | `ESTABLE`), `nivel_prioridad` (`URGENTE` | `ATENCION` | `AL_DIA`), `motivo_urgencia` (texto legible, ej: "URGENTE • Crítico"), `puntaje_prioridad` (número entero para ordenamiento determinístico), `fecha_rescate`.
       - Ubicación y Tránsito: `ubicacion_calle`, `ubicacion_detalles`, `latitud`, `longitud`, `transito_nombre`, `transito_telefono`, `transito_direccion`.
       - Estado Sanitario y Caso: `estado` (`RESCATADO`, `EN_TRANSITO`, `EN_CLINICA`, `PRE_ADOPTADO`, `EN_ADOPCION`, `ADOPTADO`, `FALLECIDO`), `castrado`, `vif`, `vilef`, `desparasitado`.
       - Sincronización y Fotos: `foto_uri`, `foto_local_uri`, `foto_remote_path`, `foto_sync_status` (`PENDING` | `SYNCED` | `FAILED`), `sync_status` (`PENDING` | `SYNCED`), `sync_version`, `creado_por_user_id`, `modificado_por_user_id`, `created_at`, `updated_at`.
     - `turnos`: agenda médica vinculada al caso con `id` (UUID v4), `caso_id`, `clinica_id`, `fecha`, `motivo`, `estado`, `recordatorio_horas_antes`, `notification_id` (identificador nativo devuelto por Expo Notifications para cancelación reactiva), `sync_status`, `updated_at`.
     - `eventos_historial`: registro cronológico inmutable (*append-only*) de eventos (rescate inicial, derivaciones, evoluciones clínicas, cambios de estado).
     - `operaciones_pendientes`: cola de mutaciones offline con `id` (UUID v4), `idempotency_key` (UUID v4 único por intento para evitar duplicados en Supabase), `tipo` (`CREATE` | `UPDATE` | `DELETE`), `tabla` (`casos` | `turnos` | `eventos_historial`), `registro_id`, `payload` (JSON con `changed_fields` para fusión delta), `reintentos`, `created_at`.
2. **Preferencias y Ajustes (`@react-native-async-storage/async-storage`):**
   - `@perf_urgency_threshold_days`: umbral dinámico de días en espera (por defecto: 15 días).
   - `@perf_supabase_session`: persistencia de sesión de Supabase Auth para habilitar autenticación offline total.
   - `@perf_last_sync_timestamp`: marca temporal (`last_synced_at`) para la hidratación incremental mediante *Pull Sync*.
3. **Monitoreo de Conectividad (`@react-native-community/netinfo`):**
   - Monitoreo reactivo en tiempo real que dispara el ciclo de sincronización automática bidireccional (`useAutoSync`) ante la reconexión.

---

## ☁️ Backend Remoto: Supabase (Auth + RLS + Storage)

El backend de **PERF Móvil** está implementado sobre **Supabase** (PostgreSQL en la nube con Supabase Auth y Storage Privado), diseñado para operar bajo un modelo distribuido y tolerante a desconexiones.

### 1. Seguridad y Control de Acceso (Row Level Security - RLS)
- **Script Consolidado de Infraestructura:** [`supabase/schema.sql`](supabase/schema.sql).
- **Políticas de Seguridad Estrictas:**
  - Se habilitó RLS en todas las tablas: `casos`, `turnos`, `eventos_historial`, `centros_veterinarios`, `conflictos` y `perfiles`.
  - **Acceso Anónimo Denegado:** Los usuarios no autenticados (`role = anon`) tienen acceso completamente denegado a las fichas clínicas, fotos y coordenadas GPS de tránsitos.
  - **Voluntarios Verificados:** Las operaciones `SELECT`, `INSERT` y `UPDATE` están restringidas exclusivamente al rol `authenticated`.
- **Trazabilidad y Auditoría:**
  - Cada operación registra `creado_por_user_id` y `modificado_por_user_id` (provenientes de `auth.uid()`), impidiendo el repudio de cambios entre voluntarios de la brigada.
- **Supabase Auth con Persistencia Offline:**
  - La sesión de Supabase Auth se almacena en `AsyncStorage` mediante el adapter local de sesión, de modo que el voluntario mantiene su sesión activa y acceso completo a los datos locales en modo avión.
  - Interfaz de `LoginScreen` y gestión de sesión en `AjustesScreen` con visualización del usuario actual y botón de cierre de sesión seguro.

### 2. Almacenamiento Privado de Fotografías (Supabase Storage)
- **Bucket Privado `casos-fotos`:**
  - Configurado con `public = false`. Solo voluntarios con rol `authenticated` pueden subir archivos (`INSERT`) o generar URLs firmadas temporales (`createSignedUrl`).
- **Sincronización de Fotos en 2 Fases (`SincronizacionFotos.ts`):**
  - **Fase A:** El binario capturado en campo (`foto_local_uri`) se sube al bucket privado en la ruta `{caso_id}/{foto_id}.jpg`.
  - **Fase B:** Tras la subida exitosa, se obtiene la ruta remota (`foto_remote_path`), se actualiza la columna en PostgreSQL y se actualiza el estado local en SQLite como `foto_sync_status = 'SYNCED'`. Si no hay conexión o falla la subida de la imagen, el caso se sincroniza de todas formas y la fotografía queda encolada para reintento automático.

### 3. Por qué no hay clave `service_role` en la app
La clave `service_role` es la clave maestra de Supabase: **se salta todas las políticas RLS** y puede leer, editar y borrar cualquier dato y cualquier usuario. Todo lo que empieza con `EXPO_PUBLIC_` se empaqueta dentro del APK, así que cualquiera que descomprima la app (minutos de trabajo) se lleva la clave y tiene control total de la base. Por eso la seguridad tiene que estar en el servidor, no en el celular (pedido del profesor: control de acceso desde el backend). La app solo conoce la clave *publishable*.

Lo que antes hacía `adminSupabase` ahora se reparte así:

| Antes (clave maestra en la app) | Ahora |
|---|---|
| Guardar los recursos del postulante | Viajan en los datos del registro y el trigger `crear_perfil_al_registrarse` los copia al perfil |
| Listar postulaciones pendientes | Consulta normal con RLS: solo el administrador ve los perfiles no aprobados |
| Aprobar o rechazar desde **Ajustes** | Funciones SQL `aprobar_voluntario` / `rechazar_voluntario` con la sesión del administrador (la base verifica que lo sea) |
| Correo a coordinadores | Edge Function `notificar-voluntario` (usa `RESEND_API_KEY` como secret del servidor) |
| Aprobar o rechazar desde el enlace del correo | Edge Function `gestionar-voluntario`, que valida un token de un solo uso |

El token del enlace ahora lo genera el servidor y se guarda en `app_metadata`, que el usuario no puede editar. Antes lo generaba la app y el propio postulante lo conocía, así que podía aprobarse solo. `notificar-voluntario` además solo avisa de perfiles no aprobados creados en las últimas 24 hs, una sola vez por postulante.

**Cómo desplegarlo** (una vez, con la CLI de Supabase y la cuenta dueña del proyecto):
1. Pegar `supabase/migrations/20261125000000_sin_service_role.sql` en el SQL Editor.
2. `npx supabase login` y `npx supabase link --project-ref kdnosvxrgoxsopmzkghh`.
3. `npx supabase secrets set RESEND_API_KEY=re_xxx APP_URL=https://url-de-la-app-web`. `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase solos.
4. `npx supabase functions deploy notificar-voluntario` y `npx supabase functions deploy gestionar-voluntario` (`supabase/config.toml` ya las deja sin exigir JWT, porque las usa quien todavía no tiene sesión).
5. Sacar `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` y `EXPO_PUBLIC_RESEND_API_KEY` del `.env` local, y **rotar** la service role en el panel de Supabase (Project Settings > API) si alguna vez estuvo en un APK o en un repo.

---

## 🔄 Motor de Sincronización Bidireccional (`SyncEngine`)

El motor de sincronización (`src/data/remote/sincronizacion/`) resuelve los problemas clásicos de pérdida de datos en aplicaciones móviles concurrentes:

### 1. Prevención de Duplicados e Idempotencia
- **Identificadores UUID v4 en el Cliente:** Tanto los casos, los turnos como los eventos generan su clave primaria antes de guardarse en SQLite.
- **Idempotency Keys:** Cada mutación en la cola `operaciones_pendientes` lleva un `idempotency_key`. Al impactar en el servidor se utiliza `UPSERT` (`onConflict: 'id'`), de modo que múltiples reintentos por microcortes de red nunca duplican registros.

### 2. Resolución de Conflictos sin Pérdida de Datos
- **Registros Inmutables / Append-Only (`turnos`, `eventos_historial`):**
  - Los eventos clínicos y turnos no se sobreescriben. Si dos voluntarios agregan evoluciones en el mismo felino sin conexión, al sincronizar ambos registros coexisten ordenados cronológicamente sin pisarse.
- **Fusión Parcial por Campos (Field-Level / Delta Merge):**
  - Al editar un caso, el cliente no envía la fila completa sino un delta con `changed_fields` y su `updated_at`.
  - La función remota `aplicar_cambios_caso()` en PostgreSQL aplica un merge campo por campo. Si el *Voluntario A* modificó el teléfono de tránsito y el *Voluntario B* actualizó la gravedad clínica, ambos cambios se fusionan e integran íntegros.
- **Regla de Cierre Definitivo:**
  - Si un caso pasa a estado `ADOPTADO` o `FALLECIDO`, el servidor y el cliente bloquean cualquier actualización clínica o de tránsito desfasada proveniente de otros dispositivos.

### 3. Hidratación Incremental (Pull Sync)
- La función `pullRemoteChanges(last_synced_at)` consulta a Supabase los registros con `updated_at > last_synced_at` y ejecuta un `UPSERT` en el SQLite local.
- Si un voluntario inicia sesión en un dispositivo nuevo o vacío, la hidratación descarga automáticamente toda la base compartida de rescates, turnos e historiales.

---

## 🔔 Notificaciones y Alarmas Locales en Android (`expo-notifications`)

1. **Canal de Alta Prioridad Android (`setNotificationChannelAsync`):**
   - Se crea el canal nativo `'turnos-veterinarios'` con importancia máxima (`AndroidImportance.MAX`), patrón de vibración `[0, 250, 250, 250]` y habilitación de sonido/luces LED para asegurar el disparo en Android 8.0+ (API 26+) incluso con la pantalla apagada.
2. **Permisos en Tiempo de Ejecución:**
   - La solicitud de permisos de notificación se realiza de forma contextual cuando el voluntario agenda su primer turno médico, manejando elegantemente el rechazo sin interrumpir el flujo.
3. **Cancelación Reactiva de Notificaciones:**
   - Al programar el turno con `scheduleNotificationAsync`, el identificador retornado (`notification_id`) se persiste en la tabla `turnos` de SQLite.
   - Si el turno es marcado como cumplido, cancelado por el voluntario o el animal es adoptado, el sistema ejecuta `cancelScheduledNotificationAsync(notification_id)` para evitar alarmas obsoletas.

---

## 🎯 Criterio de Urgencia Multicriterio (`CalcularPrioridadCasoUseCase`)

El sistema reemplazó el conteo de días simple por un modelo de triaje multicriterio alineado con la realidad del rescate animal:

| Nivel de Prioridad | Criterios Determinísticos de Asignación | Puntaje Base |
|---|---|---|
| **URGENTE (Prioridad 1)** | `gravedad_clinica === 'CRITICA'` **O** `vulnerabilidad === 'LACTANTE_SIN_MADRE'` **O** `vulnerabilidad === 'SIN_TRANSITO'` **O** días **sin revisión** $>$ umbral configurable (15 días). | 700 - 1000 |
| **ATENCION (Prioridad 2)** | `gravedad_clinica === 'MODERADA'` **O** `vulnerabilidad === 'EN_TRATAMIENTO'` **O** días sin revisión $\ge 70\%$ del umbral (11 días con umbral 15). | 400 - 600 |
| **AL_DIA (Prioridad 3)** | Casos activos estables que no cumplen condiciones de urgencia ni atención. | 100 - 300 |
| **Casos Cerrados** | Casos en estado `ADOPTADO` o `FALLECIDO` **nunca** se computan como urgentes. | 0 |

- **Días sin revisión:** se cuentan desde la última revisión del caso (visita veterinaria, nota, tratamiento, desparasitación, vacunación o cirugía) y, si nunca hubo una, desde el rescate. Cambiar el tránsito o adoptar no cuenta como revisar.
- **Accesibilidad en Interfaz:**
  - El formulario de alta (Paso 2) y el detalle de caso cuentan con chips táctiles accesibles con altura mínima de **48dp** y contraste accesible.
  - Las tarjetas (`CasoCard`) y badges (`UrgenciaBadge`) muestran tanto el código cromático como la etiqueta textual del motivo (ej. *"URGENTE • Crítico"*, *"URGENTE • Lactante sin madre"*, *"URGENTE • +16 días"*).

---

## ✅ Pedidos del equipo: qué se hizo y qué falta

Estado real de la lista de pedidos de la segunda etapa (actualizado el 24/11/2026, ya integrados los cambios de Facu y de Tobías).

| # | Pedido | Estado |
|---|---|---|
| 4 | Gestión de perfil | ✅ La foto del encabezado abre **Mi perfil** (datos, zonas, recursos) con **Editar mi perfil**; cerrar sesión y la versión pasaron ahí |
| 5 | Cada coordinador ve sus casos | ✅ Selector **Todos / Mis casos** en la bandeja (coincide por nombre, ver "Roles y perfiles") |
| 6 | Más barrios y zonas en el registro | ✅ 23 zonas, varias a la vez y "otra zona" de texto libre |
| — | Vistas de perfiles | ✅ Lista de voluntarios con buscador y perfil de cada uno |
| 11 | Prioridad por nivel de estado | ✅ Triaje multicriterio (gravedad clínica, vulnerabilidad y días desde la última revisión), ver "Criterio de Urgencia" |
| — | Aprobación de voluntarios y cambio de clave | ✅ Correo a coordinadores, Panel de Coordinación y `CambiarClaveScreen` |
| 13 | Seguridad y acceso desde el backend | 🟡 Hecho: login con JWT, RLS en todas las tablas, fotos privadas. Falta sacar la clave `service_role` de la app (ver "Base de datos compartida") |
| 10 | Un único administrador | ✅ Migración `20261112000000_administrador_unico.sql` aplicada en Supabase |
| 1 | Animales con seguimiento individual | 🟡 Hecho en la app: tabla `animales` sincronizada y ficha sanitaria por animal (selector cuando el caso tiene varios). Falta aplicar la migración `20261126000000` en Supabase para los casos que ya existían |
| 2 | Coordinador responsable como registro fijo | ❌ Falta |
| 3 | Tests virales como registro fijo | ❌ Falta |
| 7 | Registro de veterinarios | ❌ Falta |
| 8 | Horarios según el veterinario | ❌ Falta |
| 9 | Recordatorio configurable | ✅ Se elige la anticipación (30 min, 1 h, 2 h, 1 día o 2 días) al agendar y el valor por defecto en Ajustes |
| 12 | Que el cambio requiera tocar **Guardar** | ❌ Falta (hay que definir en qué pantallas) |
| 14/15 | Sacar al veterinario al guardar un rescate | ✅ Se quitó el botón de `RescateGuardadoScreen` |

### Checklist del proyecto
`[x]` hecho · `[ ]` falta. Lo que falta está ordenado por prioridad: 🔴 pedidos del equipo y de los profesores · 🟠 seguridad y riesgos para la demo · 🟡 mejoras.

**Hecho**
- [x] Mi perfil, editar perfil, cerrar sesión y versión (4)
- [x] Selector Todos / Mis casos en la bandeja (5)
- [x] 23 zonas, varias a la vez y "otra zona" en el registro (6)
- [x] Lista de voluntarios con buscador y perfil de cada uno
- [x] Prioridad por triaje multicriterio: gravedad, vulnerabilidad y días de espera (11)
- [x] Aprobación de voluntarios por correo, Panel de Coordinación y cambio de clave
- [x] Login con JWT, RLS en todas las tablas y fotos privadas (parte de 13)
- [x] Sincronización campo a campo, con conflictos guardados, sin duplicados y con fotos
- [x] Sesión recordada y candado de huella o PIN al abrir la app
- [x] Modelo por animal, pendientes y adopciones en la base (migración escrita)
- [x] Probado en emulador contra Supabase: alta, descarga, edición offline y conflicto
- [x] Turnos veterinarios sin superposición

**Falta**

🔴 **Pedidos abiertos**

- [x] **Sacar al veterinario del guardado de rescate** (14/15): se quitó el botón "Agendar primer turno veterinario" de `RescateGuardadoScreen`; el turno se sigue agendando desde la agenda.
- [x] **Recordatorio configurable** (9): se elige con cuánta anticipación avisar (30 min, 1 h, 2 h, 1 día o 2 días) al agendar el turno; en Ajustes se define cuál viene marcado por defecto.
- [ ] **Botón Guardar** (12): que los cambios no se apliquen solos, sino al tocar Guardar. Definir en qué pantallas.
- [x] **Administrador único** (10): migración `20261112000000_administrador_unico.sql` aplicada en Supabase (había un solo coordinador, así que no cambió el rol de nadie).
- [ ] **Registro de veterinarios y horarios por veterinario** (7, 8): hoy los centros son locales y los horarios son una lista fija por centro.
- [x] **Animales con seguimiento individual** (1): en la app, el caso guarda y sincroniza sus animales; la ficha sanitaria se edita animal por animal (selector cuando hay varios) y la del caso es el resumen del grupo (lo peor de cada uno). Falta aplicar en Supabase `20261126000000_cargar_animales_de_casos_existentes.sql` para los casos que ya existían (y, si se quiere, editar nombre, peso, embarazo y fallecimiento de cada animal).
- [ ] **Coordinador responsable y tests virales como registros fijos** (2, 3): con ID propio. Con eso "Mis casos" deja de comparar por nombre.
- [x] **Prioridad con "última revisión"** (11): cada caso tiene la fecha de su última revisión (el evento más reciente del historial que sea visita veterinaria, nota, tratamiento, desparasitación, vacunación o cirugía; **no** cuentan los cambios de tránsito ni las adopciones). Se deriva del historial al leer (`SQL_CASO_CON_REVISION`), así que no hay columna nueva ni migración. Los días del cálculo se cuentan desde esa revisión (sin revisiones, desde el rescate): un caso viejo pero revisado hace poco no sube a urgente solo por los días. El detalle muestra "Última revisión". **Validar con el refugio** si 7/11 días sin revisión (el 70% y el 100% del umbral de Ajustes) es lo que necesitan.
- [x] **Unificar el cálculo de prioridad**: hay una sola fuente, `CalcularPrioridadCasoUseCase` (se borró `domain/services/PrioridadCaso.ts`, que no usaba nadie). `prioridadDeCaso()` y `calcularUrgencia()` de `Caso.ts` la usan, y las tarjetas, el detalle y los filtros **calculan al mostrar** con el umbral de Ajustes (antes leían el nivel guardado, que quedaba viejo con los días y no respondía al umbral).
- [ ] **Validar los pesos de la prioridad con el refugio** (el profesor pidió que responda a necesidades reales): hoy son 1000 crítico, 900 lactante sin madre, 800 sin tránsito, 700 por días de espera, 500 moderado, 450 en tratamiento y 400 por espera. Los pendientes por animal (cirugía, estudio, castración) todavía no suman al puntaje.
- [ ] **Aplicar `20261031000000_animales_pendientes_adopciones.sql`** y `20261124000000_compatibilidad_etapa2.sql` en el Supabase de Tobías (`kdnosvxrgoxsopmzkghh`, es producción: avisar antes). Siempre se usa la base de Tobías, no la de Facu.

🟠 **Seguridad y riesgos para la demo**

- [x] **Sacar la clave `service_role` de la app** (en el código; ver "Por qué no hay clave `service_role` en la app"). Desplegado en Supabase: migración `20261125…sin_service_role` aplicada y las 2 Edge Functions activas. **Falta** cargar los secrets `RESEND_API_KEY` y `APP_URL` (sin ellos el correo no sale), **rotar la clave `service_role`** y probar el correo y el enlace de aprobación.
- [x] **Cerrar el acceso anónimo** (en el código): migración `20261125000100_cerrar_acceso_anonimo.sql`, que le saca al rol `anon` el permiso sobre todas las tablas (segunda barrera además de RLS). Aplicada en Supabase y verificada (el rol `anon` ya no tiene permisos sobre ninguna tabla).
- [ ] **Botón "Voluntario Demo (Modo Offline)"** del login: entra sin contraseña. Quitarlo o dejarlo solo en modo desarrollo (`__DEV__`).
- [x] **Contraseñas fuera del README**: se sacó la del voluntario de prueba (el administrador ya no la tenía). **Falta en Supabase** borrar esas cuentas o cambiarles la clave, porque la anterior quedó en el historial de git de un repo público.
- [x] **Error de notificaciones** "Custom sound 'default' not found": el canal se creaba con `sound: 'default'`, que la librería busca como archivo. Ahora se omite y se usa el sonido del sistema, en un canal nuevo (`turnos-veterinarios`) porque Android no deja modificar un canal ya creado.
- [ ] **Datos locales de versiones anteriores**: un celular con una instalación vieja muestra mal la urgencia (las columnas de triaje quedan con valores por defecto). Recalcular la prioridad en la migración de la base local, o limpiar los datos de la app.

🟡 **Mejoras**

- [ ] Algunos rescates guardan el barrio como coordenadas (por ejemplo `-34.60940, -58.41060`): revisar la geocodificación inversa y su valor de respaldo.
- [ ] Foto de perfil propia: hoy es una imagen fija y las iniciales.
- [ ] Pruebas de lo nuevo: `sigueElCaso` y zonas.
- [ ] Una sola fuente de verdad del esquema: `supabase/schema.sql` y `supabase/migrations/` conviven y pueden diferir.
- [ ] Eliminar `data/mock/` y el `MockRemoteApiClient`, y **probar el circuito completo (registro, consulta y actualización) en dos celulares físicos**, la recuperación de datos tras reinstalar y los recordatorios en dispositivos reales (lo pidió el profesor).
- [ ] Nombre de paquete de la app (`com.anonymous.PERFtmp`) y generar el APK/AAB de entrega.
- [ ] **Limpiar datos de prueba en Supabase**: el usuario de prueba, los casos "PRUEBA SYNC 1/2/3", sus eventos y el conflicto de prueba.
- [ ] **Más animales, no solo gatos**: el formulario ya permite Gato, Perro y Otro, pero "Otro" no pide qué animal es. Que al elegir **Otro** se pueda indicar qué animal doméstico es (conejo, cobayo, ave, tortuga, etc.) con una lista y texto libre, ampliar el `check` de `especie` en `schema.sql` y en la migración, y sacar el "foco felino" de los textos. Los tests virales (FIV/FeLV) son de gatos: para perros definir con el refugio qué estudios y pendientes aplican (parvovirus, moquillo, desparasitación).

### Roles y perfiles
- **Dos roles:** un **único administrador** y el resto voluntarios. En la base el rol del administrador se llama `coordinador` (así lo usan `es_coordinador()`, las políticas RLS, el panel de aprobaciones y los correos); la app lo muestra como **Administrador** (`ETIQUETA_ROL`, `esAdministrador()` en `domain/models/Ajustes.ts`). La migración `20261112000000_administrador_unico.sql` agrega un índice único parcial para que haya uno solo; ya está aplicada en Supabase.
- **Zonas múltiples:** cada voluntario elige una o más zonas (`SelectorZonas`). Se guardan en la columna `perfiles.zona` separadas por coma (`"Caballito, Almagro"`), así que no cambió el esquema. Helpers: `zonasDesdeTexto` y `zonasATexto`.
- **Mis casos:** un caso es "de" un voluntario si `quienSigueCaso` coincide con su nombre o su primer nombre (`sigueElCaso()`). Es una coincidencia por texto hasta que el coordinador responsable pase a ser un registro con ID propio.
- **Vistas de perfiles:** `PerfilesScreen` lista a los voluntarios aprobados y `PerfilDetalleScreen` muestra el perfil completo. Leen `perfiles`, que solo responde a usuarios autenticados y aprobados: sin sesión la lista sale vacía.
- **Cuentas de prueba** (correos `@example.com`, solo para desarrollo). **Las contraseñas no van en este archivo**: el repo es público y estas cuentas entran a la base compartida. Se piden al equipo.

  | Rol | Correo |
  |---|---|
  | Voluntario | `perf.voluntario.test@example.com` |
  | Administrador | `perf.admin.test@example.com` |

  Si una contraseña estuvo publicada (la del voluntario estuvo en este README hasta el commit que la sacó, y sigue en el historial de git) hay que **darla por comprometida**: borrar la cuenta y crearla de nuevo con otra clave, o cambiarla desde Supabase → Authentication → Users. Para borrar las dos: `delete from auth.users where email like 'perf.%.test@example.com';` (también se borra su perfil).

### Base de datos compartida
- **Proyecto de Supabase del equipo:** el de Tobías (`kdnosvxrgoxsopmzkghh`). Es el valor por defecto de `src/data/remote/supabaseClient.ts`; se puede cambiar con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_KEY` en `.env`.
- **Si se pausa:** los proyectos gratuitos se pausan tras una semana sin uso. Se restaura desde el panel con **Restore project** y no se pierden datos.
- **Migraciones, en este orden** (SQL Editor, una vez cada una): `20261030…esquema_inicial`, `20261031…animales_pendientes_adopciones`, `20261112…administrador_unico` y `20261124…compatibilidad_etapa2` `20261125…sin_service_role`, `20261125…cerrar_acceso_anonimo` y `20261126…cargar_animales_de_casos_existentes` (esta última crea los animales de los casos que ya existían). Esta última adapta la base al código de la Etapa 2 (columnas de triaje en `casos`, bucket `casos-fotos`, `aplicar_cambios_caso()` nueva y las funciones `aprobar_voluntario` / `rechazar_voluntario`).
- `supabase/schema.sql` es el script completo para un proyecto **vacío**; en el proyecto existente se usan las migraciones, no los dos.
- **Seguridad:** la app ya no usa la clave `service_role` (ver la sección siguiente). Las migraciones y las Edge Functions ya están aplicadas; para que salga el correo faltan los secrets `RESEND_API_KEY` y `APP_URL`.

---

## 📱 Módulos y Pantallas

### 1. Autenticación (`presentation/screens/auth/`)
- **`LoginScreen`**: Inicio de sesión del voluntario con credenciales, selector para mostrar/ocultar contraseña, opción de recordar sesión e indicador de modo online/offline.
- **`RegistroScreen`**: Alta de voluntarios (nombre, teléfono, **una o más zonas** con `SelectorZonas`, recursos, correo y contraseña). La cuenta queda pendiente hasta que el administrador la apruebe.
- **`CambiarClaveScreen`**: restablecimiento de contraseña desde el enlace del correo.

### 2. Gestión de Casos (`presentation/screens/casos/` & `detalle/`)
- **`CasosScreen`**: Pantalla principal con:
  - Buscador reactivo por nombre provisorio o ubicación.
  - Selector **Todos / Mis casos** (solo los que sigue el voluntario de la sesión) y, debajo, filtros de urgencia **Urgentes**, **Atención** y **Al día** (tocar de nuevo para quitarlos).
  - Tarjeta destacada de casos críticos urgentes.
  - Pull-to-refresh y lista optimizada de tarjetas (`CasoCard`).
- **Estados de Pantalla:**
  - `CasosCargando`: estado de carga (skeleton / shimmer).
  - `CasosVacio`: estado sin casos coincidentes con sugerencias.
  - `CasosError`: pantalla de captura de fallos con reintento.
- **`DetalleCasoScreen`**:
  - Fotografía ampliada del rescate.
  - Reseña sanitaria: estado de castración, test VIF/ViLeF y fechas de desparasitaciones.
  - Ubicación de rescate y domicilio actual de tránsito con geolocalización.
  - Línea de tiempo con historial de eventos (`eventos_historial`).
  - Accesos directos para agendar turno o solicitar cambio de estado.

### 3. Flujo "Nuevo Rescate" (`presentation/screens/rescate/`)
Asistente guiado de 3 pasos con barra de progreso superior (`BarraRescate`):
- **Paso 1: Foto (`PasoFoto`)**
  - Visor en vivo con `CameraView` de `expo-camera`.
  - Controles de flash (automático, activado, desactivado) y switch entre cámara frontal y trasera.
  - Acceso alternativo a la galería multimedia del teléfono (`expo-image-picker`).
  - Opción de "Omitir foto por urgencia" para situaciones críticas en la calle.
- **Paso 2: Datos del Animal (`PasoDatos`)**
  - Nombre provisorio, especie (gato, perro u otro), cantidad de animales, edad estimada, estado visible y temperamento.
  - Preguntas de triaje que calculan automáticamente la urgencia del caso.
  - Botón **"Usar mi ubicación"**: obtiene coordenadas GPS mediante `expo-location` y ejecuta geocodificación inversa para obtener la calle y barrio de forma legible (con límite de 15 segundos para no bloquear la app).
- **Paso 3: Confirmación (`PasoConfirmar`)**
  - Resumen completo de la información antes de guardar.
- **Pantallas de Resultado:**
  - `RescateGuardadoScreen`: confirmación con indicador de guardado local / pendiente de sincronizar.
  - `ErrorGuardadoScreen`: manejo de fallos con opción de reintentar sin perder los datos ingresados.

### 4. Cambio de Estado (`presentation/screens/estado/`)
- **`CambioEstadoScreen`**: Flujo para actualizar la situación del animal entre los estados disponibles:
  - `EN_TRANSITO`, `EN_CLINICA`, `PRE_ADOPTADO`, `EN_ADOPCION`, `ADOPTADO`, `FALLECIDO`.
  - Validación de destino obligatorio si el caso se deriva a clínica o tránsito.
  - Motivo del cambio obligatorio con registro automático en el historial de eventos del caso.
- **`ConfirmacionCambioScreen`**: Resumen visual de la actualización efectuada.

### 5. Agenda Veterinaria y Recordatorios (`presentation/screens/turnos/`)
- **`TurnosScreen`**: Listado cronológico de turnos agendados, filtrado por clínica veterinaria, opción para marcar como cumplido o cancelar.
- **`AgendarTurnoScreen`**:
  - Selección de clínica y motivo de consulta.
  - Selector de fecha y hora.
  - Configuración de alertas anticipadas (1 día antes / 2 horas antes).
- **`TurnoAgendadoScreen`**: Confirmación con resumen de notificaciones programadas y botón para realizar llamada telefónica directa al centro veterinario.
- **`TurnoNoDisponibleScreen`**: Manejo de cupos ocupados que sugiere de manera automática los dos horarios libres más próximos.

### 6. Ajustes y Diagnóstico (`presentation/screens/ajustes/`)
- **`AjustesScreen`**:
  - Configuración del umbral de días para marcar casos como urgentes (1 a 30 días).
  - Preferencias predeterminadas para recordatorios de turnos.
  - **Sincronización manual:** botón para forzar el envío de operaciones pendientes.
  - Diagnóstico de memoria local: contador de casos activos, eventos archivados y espacio utilizado en MB.
  - **Panel de Coordinación** (solo para el administrador): solicitudes de voluntarios pendientes (`AprobacionVoluntariosScreen`, `ProcesarSolicitudScreen`).
  - Termina en las notificaciones de turnos: la sesión, los perfiles y el cierre de sesión están en **Mi perfil**.
- **`PerfilDetalleScreen`**: se abre al tocar la foto del encabezado. Mi perfil muestra datos, zonas y recursos, con **Editar mi perfil**, acceso a **Perfiles de voluntarios** y **Cerrar sesión**; el perfil de otro voluntario es de solo lectura e incluye los casos que sigue.
- **`PerfilesScreen`**: lista de voluntarios con rol y zonas.
- **`PerfilVoluntarioScreen`**: edición de mis datos, zonas y recursos.

### 7. Archivo de Casos (`presentation/screens/archivo/`)
- **`ArchivoScreen`**: Sección destinada a consultar el histórico de animales adoptados o finalizados.

---

## 🛠️ Tecnologías y Librerías

| Tecnología / Paquete | Versión | Propósito en el Proyecto |
|---|---|---|
| **React** | `19.2.3` | Biblioteca base para componentes de interfaz de usuario. |
| **React Native** | `0.86.3` | Framework móvil multiplataforma. |
| **Expo** | `~57.0.27` | Ecosistema y suite de desarrollo para React Native. |
| **TypeScript** | `~6.0.3` | Tipado estático estricto para modelos de dominio, use cases y componentes. |
| **React Navigation** | `^7.x` | Navegación nativa con Stack y Bottom Tabs. |
| **Zustand** | `^5.0.16` | Gestión de estado global ligera, reactiva y sin boilerplate. |
| **expo-sqlite** | `~57.0.4` | Persistencia relacional local rápida con modo WAL. |
| **AsyncStorage** | `2.2.0` | Persistencia clave-valor para configuraciones y ajustes. |
| **expo-camera** | `~57.0.6` | Acceso a cámara de fotos para capturar el rescate en vivo. |
| **expo-image-picker** | `~57.0.20` | Selección de fotografías desde la galería del dispositivo. |
| **expo-location** | `~57.0.21` | Captura de coordenadas GPS y geocodificación inversa a direcciones. |
| **expo-notifications** | `~57.0.23` | Programación de alarmas y notificaciones locales sin conexión. |
| **NetInfo** | `12.0.1` | Detección en tiempo real del estado de conexión a internet. |
| **Plus Jakarta Sans** | `^0.4.2` | Tipografía institucional moderna (Google Fonts). |
| **@expo/vector-icons** | `^15.0.2` | Iconos del sistema (MaterialIcons). |

---

## 🎨 Sistema de Diseño y Estilos

- **Tipografía:** *Plus Jakarta Sans* en variantes Regular (400), SemiBold (600) y Bold (700).
- **Paleta de Colores (`presentation/theme/colors.ts`):**
  - **Primary:** `#005C55` (Verde esmeralda institucional)
  - **Primary Soft:** `#E6F2F0`
  - **Secondary:** `#FFBE0B` (Amarillo cálido para alertas y badges)
  - **Background:** `#FAF7EF` (Tono neutro cálido tipo papel)
  - **Surface:** `#FFFFFF` (Blanco puro para tarjetas y modales)
  - **Urgencia Alta:** Fondo `#FEE2E2`, Texto `#B91C1C`
  - **Urgencia Media:** Fondo `#FEF3C7`, Texto `#B45309`
  - **Urgencia Baja:** Fondo `#E0E7FF`, Texto `#3730A3`
  - **Texto Principal:** `#1F2937` | **Texto Secundario:** `#6B7280`

---

## 🚀 Requisitos Previos

Antes de instalar y correr la aplicación, asegurate de tener instalado en tu computadora:

1. **Node.js**: Versión `20.x` o superior (LTS recomendada).
   - Verificar con: `node -v`
2. **npm** (incluido con Node.js) o **yarn**.
3. **Dispositivo o Emulador de Pruebas:**
   - **Opción A (Recomendada - Teléfono Físico):** Instalar la app gratuita **Expo Go** desde Google Play Store (Android) o App Store (iOS).
   - **Opción B (Emulador Android):** Tener instalado **Android Studio** con un AVD (Android Virtual Device) configurado.
   - **Opción C (Nativo Android con `run:android`):** Requiere **JDK 21** configurado y variables de entorno `ANDROID_HOME` y `JAVA_HOME`.

---

## 📦 Instalación y Configuración

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Fashisus07/PERF-App.git
   cd PERF-App
   ```

2. **Instalar dependencias del proyecto:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno (`.env`):**
   Copia el archivo `.env.example` a `.env` y configura tus credenciales de Supabase:
   ```bash
   cp .env.example .env
   ```
   Contenido de `.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-publica
   ```

4. **Desplegar la infraestructura en Supabase (`supabase/schema.sql`):**
   - Ingresa al panel de Supabase en [supabase.com](https://supabase.com).
   - Dirígete a la sección **SQL Editor**.
   - Abre y copia el contenido completo de [`supabase/schema.sql`](supabase/schema.sql) y haz clic en **Run**.
   - Esto creará automáticamente:
     - Las tablas (`casos`, `turnos`, `eventos_historial`, `centros_veterinarios`, `conflictos`, `perfiles`).
     - Las políticas de seguridad **Row Level Security (RLS)** que bloquean el acceso anónimo (`anon`) y permiten lectura/escritura a usuarios autenticados (`authenticated`).
     - El bucket privado de Storage `casos-fotos` con sus directivas de acceso firmado.
     - La función de base de datos `aplicar_cambios_caso()` para la fusión *delta merge* campo por campo.

5. **Verificar compilación estricta de TypeScript:**
   ```bash
   npx tsc --noEmit
   ```

6. **Ejecutar Suite de Tests Unitarios (Jest):**
   ```bash
   npm test
   ```
   Ejecuta 17 pruebas unitarias automatizadas cubriendo:
   - `CalcularPrioridadCasoUseCase.test.ts`: Modelo multicriterio (casos críticos inmediatos vs. transcurso de días, lactantes sin madre, umbral configurable, exclusión de casos adoptados/fallecidos).
   - `DeltaMerge.test.ts`: Fusión parcial de campos concurrentes, diferencias delta y bloqueo de casos cerrados.
   - `ColaOffline.test.ts`: Idempotencia de cola local, coexistencia *append-only* de turnos/historial e hidratación *Pull Sync* para dispositivos nuevos.

---

## 🏃‍♂️ Cómo Iniciar el Proyecto

### 1. Iniciar el Servidor de Desarrollo (Expo Metro)

```bash
npm start
# O alternativamente:
npx expo start
```

Al ejecutarse, Metro Bundler mostrará un código QR en la terminal y un panel con atajos interactivos:
- Presioná `a` para abrir directamente en un emulador de Android conectado.
- Presioná `w` para abrir la versión Web en tu navegador.
- Presioná `r` para recargar la aplicación en caliente (Fast Refresh).

### 2. Probar en un Dispositivo Móvil Físico (Expo Go)

1. Conectá tu teléfono a la **misma red Wi-Fi** que la computadora donde corre Metro.
2. Abrí la app **Expo Go** en tu celular.
3. Escaneá el código QR mostrado en la terminal.
4. *Tip:* Si estás en redes públicas o con aislamiento entre dispositivos, podés iniciar con el flag de túnel:
   ```bash
   npx expo start --tunnel
   ```

### 3. Ejecución Nativa en Android (Build Local)

Si necesitás compilar los módulos nativos completos de Android (para probar permisos del sistema operativo y canales de notificación al 100%):

```bash
npm run android
# O equivalentemente:
npx expo run:android
```

> **Nota para compilación nativa:** Requiere tener instalado el JDK 21 y el Android SDK. Genera la carpeta nativa `android/` en tu entorno local.

---

## 🛡️ Guía Paso a Paso para la Defensa Técnica (Demostración Multi-Dispositivo E2E)

Para defender ante los profesores el cumplimiento integral de los requerimientos de la Etapa 2 (Offline First, Tolerancia a Fallos, No Pérdida de Datos y Notificaciones Reales), seguir este guión técnico:

```
┌─────────────────────────────────┐                ┌─────────────────────────────────┐
│     DISPOSITIVO A (Campo)       │                │    DISPOSITIVO B (Coordinador)  │
│      Modo Avión Activado        │                │         Conectado a Red         │
└────────────────┬────────────────┘                └────────────────┬────────────────┘
                 │                                                  │
 1. Nuevo Rescate en Calle (Offline)                                │
    - Foto capturada localmente                                     │
    - Triaje: CRITICA + SIN_TRANSITO                                │
    - Asignado URGENTE • Crítico                                    │
    - Persistido en SQLite con UUID v4                              │
    - Encolado con idempotency_key                                  │
                 │                                                  │
 2. Reconexión Dispositivo A                                        │
    - useAutoSync detecta red                                       │
    - Fase A: Sube foto a bucket privado                            │
    - Fase B: Actualiza foto_remote_path                            │
    - UPSERT idempotente en Supabase                                │
                 │                                                  │
                 └──────────────► Servidor Supabase ───────────────►│
                                                                    │
                                    3. Hidratación Automática (Pull Sync)
                                       - Ejecuta pullRemoteChanges()
                                       - Descarga caso, historial y foto
                                       - Agenta Turno en Veterinaria
                                       - Notificación MAX programada
                                       - Modifica transito_direccion
                                                                    │
                 ◄────────────── Servidor Supabase ◄────────────────┘
                 │
 4. Edición Concurrente y Delta Merge
    - Dispositivo A edita gravedad_clinica a MODERADA
    - Sincronizan ambos dispositivos
    - aplicar_cambios_caso() fusiona campo por campo
    - RESULTADO: Ambos cambios coexisten íntegros sin sobreescritura
                 │
 5. Cierre de Caso y Cancelación de Alarmas
    - Se pasa el caso a estado ADOPTADO
    - Se cancela reactivamente la alarma local mediante notification_id
    - Caso queda sellado contra modificaciones desfasadas
```

### Paso 1: Operación Offline en Campo (Dispositivo A)
1. Activar el **Modo Avión** en el Dispositivo A.
2. Iniciar el flujo **"Nuevo Rescate"**:
   - Tomar o seleccionar una fotografía felina (se comprime y guarda como `foto_local_uri`).
   - Cargar datos: nombre *"Michi Callejero"*, ubicación obtenida por GPS.
   - En el Triaje Multicriterio, seleccionar chips: **Gravedad Clínica: CRITICA** y **Vulnerabilidad: SIN_TRANSITO**.
   - La app muestra inmediatamente el banner accesible: *"Prioridad Calculada: URGENTE • Crítico"*.
3. Confirmar y guardar el rescate:
   - Se guarda de inmediato en SQLite local (`casos`) con `sync_status = 'PENDING'` y `foto_sync_status = 'PENDING'`.
   - Se genera un UUID v4 determinístico y se encola la mutación con `idempotency_key` única en `operaciones_pendientes`.
   - La pantalla de detalle y la bandeja de casos muestran el badge *"URGENTE • Crítico"* en rojo accesible.

### Paso 2: Reconexión y Sincronización en Dos Fases
1. Desactivar el **Modo Avión** en el Dispositivo A.
2. El listener de `NetInfo` dispara la sincronización automática (`useAutoSync`):
   - **Fase A (Storage):** El binario local se sube a `casos-fotos/{caso_id}/{uuid}.jpg` en Supabase Storage.
   - **Fase B (Metadata):** Se guarda la ruta remota `foto_remote_path`, se envía el `UPSERT` a PostgreSQL y se marca `foto_sync_status = 'SYNCED'`.
   - La mutación sale de `operaciones_pendientes` únicamente tras la confirmación del servidor.

### Paso 3: Hidratación en Dispositivo B (Pull Sync) y Agenda de Turno
1. En el Dispositivo B (emulador o segundo teléfono conectado):
   - Iniciar sesión con credenciales de voluntario autenticado.
   - Al presionar **Sincronizar** (o automáticamente en el refresco), `pullRemoteChanges(last_synced_at)` consulta registros con `updated_at > last_synced_at`.
   - El caso *"Michi Callejero"* aparece instantáneamente en la bandeja con todos sus datos y fotografía visible mediante URL firmada.
2. Agendar un turno veterinario:
   - Ingresar al detalle de *"Michi Callejero"* > **Agendar Turno**.
   - Elegir fecha, clínica y con cuánta anticipación avisar (30 min, 1 h, 2 h, 1 día o 2 días; las que ya pasaron quedan deshabilitadas).
   - El sistema solicita permisos nativos de notificación, configura el canal Android `turnos-veterinarios` (`AndroidImportance.MAX`, sonido, vibración) y guarda el `notification_id` nativo retornado en la tabla `turnos`.

### Paso 4: Demostración de Fusión Delta sin Pérdida de Datos
1. Sin conexión en Dispositivo A:
   - El Voluntario A cambia la **Gravedad Clínica** a `'MODERADA'` (el gato fue estabilizado).
2. En Dispositivo B:
   - El Voluntario B actualiza la **Dirección de Tránsito** a *"Av. Corrientes 1234"*.
3. Ambos dispositivos se reconectan y sincronizan:
   - Cada dispositivo envía únicamente el objeto `changed_fields` con sus marcas temporales.
   - La función PostgreSQL `aplicar_cambios_caso()` aplica la fusión a nivel campo:
     - `gravedad_clinica` se actualiza al valor de A.
     - `transito_direccion` se actualiza al valor de B.
   - **Resultado Comprobable:** En ambos teléfonos, el caso contiene **ambos cambios íntegros** sin haber sobreescrito la fila completa ni perdido información.

### Paso 5: Regla de Cierre y Cancelación de Alarma
1. Se actualiza el estado de *"Michi Callejero"* a `ADOPTADO`:
   - El repositorio detecta el cierre definitivo: cancela automáticamente la alarma médica programada mediante `cancelScheduledNotificationAsync(notification_id)`.
   - Se sella el caso contra futuras modificaciones desfasadas desde la red.

---

## 🧪 Pruebas de Capacidades Nativas en Emulador

- **Cámara:** El emulador de Android utiliza por defecto una cámara virtual animada. En un dispositivo físico capturará fotos reales y las almacenará en el almacenamiento de la app.
- **Geolocalización (GPS):** Podés simular una posición geográfica en el emulador desde la ventana de **Extended Controls** (`...` en el emulador > *Location*) o mediante comandos ADB en la terminal:
  ```bash
  adb emu geo fix -58.4106 -34.6094
  ```
- **Recordatorios / Notificaciones:** Podés inspeccionar las alarmas locales programadas por la app en Android mediante:
  ```bash
  adb shell dumpsys alarm | grep PERFtmp
  ```
- **Modo Sin Conexión (Offline):** Podés activar el Modo Avión en el teléfono o emulador; la aplicación continuará permitiendo registrar rescates, consultar detalles y agendar turnos, guardando todo en SQLite.

---

## 📄 Scripts Disponibles en `package.json`

| Comando | Descripción |
|---|---|
| `npm start` | Inicia el servidor de desarrollo de Metro con Expo. |
| `npm test` | Ejecuta la suite de pruebas unitarias automatizadas con Jest (17 tests). |
| `npm run android` | Compila y ejecuta el proyecto nativo en Android. |
| `npm run ios` | Compila y ejecuta el proyecto nativo en iOS (requiere macOS). |
| `npm run web` | Inicia el servidor para previsualización web en el navegador. |
| `npx tsc --noEmit` | Ejecuta el comprobador de tipos estricto de TypeScript sobre todo el código fuente. |

---

## 👥 Equipo de Desarrollo

Proyecto desarrollado en el marco del **Trabajo Práctico Obligatorio (TPO)** de la materia **Desarrollo de Aplicaciones I** - UADE.

- **Mateo Mirarchi**
- **Facundo Pérez Espinosa**
- **Tobías**
