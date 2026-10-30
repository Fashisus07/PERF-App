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
- **Flujo de Rescate Guiado en 3 Pasos:** Captura fotográfica con visor de cámara, geolocalización GPS automática con geocodificación inversa, y evaluación rápida de urgencia mediante triaje.
- **Priorización Inteligente:** Bandeja de casos clasificados por urgencia (Alta, Media, Baja) y umbral configurable de días en espera.
- **Seguimiento Clínico e Historial:** Ficha completa de cada animal (estado de castración, test VIF/ViLeF, desparasitaciones) y línea de tiempo de eventos.
- **Agenda Veterinaria y Alarmas Locales:** Reserva de turnos con validación de cupos y programación de recordatorios locales en el dispositivo que no dependen de conexión a internet.
- **Arquitectura Offline First:** Toda lectura y escritura se ejecuta primero contra la base de datos SQLite local (`perf.db`) y se encola en una tabla de operaciones pendientes para sincronizar cuando se recupere la conexión.

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
   - Base de datos relacional local en archivo `perf.db`.
   - Modos activados: `PRAGMA journal_mode = WAL;` y `PRAGMA foreign_keys = ON;`.
   - **Tablas:**
     - `casos`: almacena la información integral del animal, estado de rescate, datos de tránsito, coordenadas y estado de sincronización (`sync_status`).
     - `turnos`: agenda médica vinculada al caso con fecha/hora, motivo, centro veterinario y recordatorio.
     - `eventos_historial`: registro cronológico de eventos (rescate inicial, cambios de estado, derivaciones a clínicas, etc.).
     - `operaciones_pendientes`: cola de transacciones locales (`CREATE`, `UPDATE`, `DELETE`) pendientes de replicación en el servidor.
2. **Preferencias y Ajustes (`@react-native-async-storage/async-storage`):**
   - Configuración de días para marcar casos urgentes, valores por defecto de recordatorios y preferencias del voluntario.
3. **Monitoreo de Conectividad (`@react-native-community/netinfo`):**
   - Hook reactivo `useOnline()` que notifica en tiempo real si el dispositivo cuenta con acceso a internet, reflejado en barras de estado y banners visuales.

---

## ☁️ Backend Remoto: Supabase

> **Estado: en desarrollo (rama `feature/supabase-backend`).** El esquema del servidor está creado y verificado; el cliente de la app todavía **no** sincroniza datos reales (sigue usando `MockRemoteApiClient` y el login local). Lo que está hecho y lo que falta figura en la sección "Estado" de más abajo.

### Qué es y por qué Supabase
Supabase es una base **PostgreSQL en la nube** que ya incluye una API, autenticación (Supabase Auth) y almacenamiento de archivos (Storage). Es open source y el plan gratuito alcanza para un refugio. La app se instala en los teléfonos de los voluntarios; no hay un servidor propio que mantener.

Se eligió sobre las alternativas porque:
- **JSON/archivo compartido:** no resuelve accesos concurrentes, permisos ni fotos.
- **API propia (Node, etc.):** habría que programar, hostear y mantener login, permisos y almacenamiento.
- **Firebase:** su base NoSQL complica las relaciones caso → turnos → historial y los permisos por fila.

### Qué guarda cada base
| | SQLite (en el teléfono) | Supabase (en la nube) |
|---|---|---|
| Rol | Copia de trabajo: la app funciona sin señal | Fuente compartida entre voluntarios |
| Quién la ve | Solo ese teléfono | Todos los voluntarios **aprobados** |
| Cola `operaciones_pendientes` | Sí: cambios hechos sin conexión | No: es de cada dispositivo |
| Auth | — | Supabase Auth (reemplaza el login local con clave en texto plano) |
| Fotos | Ruta local (`foto_uri`) | Storage privado, bucket `fotos-casos` |

```
Teléfono A ──(SQLite + cola)──┐                       ┌── Teléfono B
                              ├──►  Supabase (RLS) ◄──┤
Teléfono C ──(SQLite + cola)──┘   Postgres · Auth · Storage
```

### Esquema del servidor
Está en [`supabase/migrations/20261030000000_esquema_inicial.sql`](supabase/migrations/20261030000000_esquema_inicial.sql). Tablas: `perfiles`, `casos`, `conflictos`, `eventos_historial`, `fotos_caso`, `centros_veterinarios` y `turnos`.

### Respuesta a la devolución de la preentrega
| Observación | Cómo se resuelve |
|---|---|
| **Urgencia solo por días** | El campo `gravedad` (`critico` / `urgente` / `estable`) se carga al ingresar el caso y reemplaza al criterio por días. *Pendiente:* validar los criterios con el refugio y adaptar la app. |
| **"Última modificación gana" pierde datos** | La función `aplicar_cambios_caso()` fusiona **campo por campo** (cada campo guarda cuándo se modificó por última vez). Si dos voluntarios cambian el mismo campo, gana el más reciente y el valor descartado queda registrado en la tabla `conflictos` para revisarlo. |
| **Duplicaciones** | Todos los ids son UUID generados en el teléfono: reenviar una operación no crea un registro nuevo. |
| **Historial** | `eventos_historial` es de solo-agregar (no se edita ni se borra), por lo que no puede haber conflictos. |
| **Fotos** | Cada foto es una fila nueva con ruta única en un bucket privado (máx. 5 MB; jpg, png o webp). Se sube con su propia cola de reintentos. |
| **Seguridad y acceso** | Todas las tablas tienen RLS. Un registro nuevo queda **pendiente** hasta que un **coordinador lo aprueba**; solo los aprobados ven casos, fotos y ubicaciones. Nadie puede aprobarse ni cambiarse el rol a sí mismo (lo bloquea un trigger). El usuario sin sesión no accede a nada. |
| **Integración real** | *Pendiente:* cliente de Supabase en la app y prueba entre dos dispositivos reales. |

### Límites conocidos
- El orden de los cambios depende del **reloj de cada teléfono**: uno con la hora mal podría ganar un conflicto que no debería.
- Los casos no se editan directo en la tabla: no hay política de `UPDATE`/`DELETE`, todo cambio pasa por `aplicar_cambios_caso()`.
- El primer coordinador se crea a mano desde el SQL Editor (nadie puede aprobar al primero).
- La clave `sb_publishable_...` del cliente es pública por diseño; la seguridad la dan las políticas RLS. La clave `secret`/`service_role` **nunca** va en la app ni en el repositorio.

### Estado
- [x] Proyecto de Supabase creado (región São Paulo) y esquema aplicado
- [x] Tablas, RLS, permisos y bucket de fotos verificados con consultas sin sesión
- [x] Cliente instalado (`src/data/remote/supabaseClient.ts`, sesión guardada en AsyncStorage)
- [x] Login y registro con Supabase Auth (`SupabaseAuthRepository`; reemplaza al login local con clave en texto plano). *Falta probarlo en el emulador/dispositivo.* Las cuentas nuevas quedan pendientes y no pueden entrar hasta que un coordinador las apruebe
- [ ] Pantalla de aprobación de voluntarios para coordinadores
- [ ] `sincronizar()` real: subir la cola, bajar cambios, manejar conflictos
- [ ] Subida de fotos a Storage con reintentos
- [ ] Criterio de urgencia por gravedad en la app
- [ ] Prueba del circuito completo en dos dispositivos reales (incluidos los recordatorios)
- [ ] Eliminar `data/mock/` y el `MockRemoteApiClient`

### Cómo reproducir el backend
1. Crear un proyecto en [supabase.com](https://supabase.com) (región South America – São Paulo).
2. En **SQL Editor**, pegar el **contenido** de `supabase/migrations/20261030000000_esquema_inicial.sql` y ejecutarlo.
3. En **Authentication → Sign In / Providers → Email**, desactivar *Confirm email* mientras se prueba.
4. Aprobar un voluntario (la primera vez, a mano, desde el SQL Editor; después lo hace un coordinador desde la app):
   ```sql
   update public.perfiles set aprobado = true, rol = 'coordinador' where email = 'tu-correo@ejemplo.com';
   ```
5. Copiar la *Project URL* y la clave *publishable* en `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_KEY` (o en `src/data/remote/supabaseClient.ts`).

---

## 📱 Módulos y Pantallas

### 1. Autenticación (`presentation/screens/auth/`)
- **`LoginScreen`**: Inicio de sesión del voluntario con credenciales, selector para mostrar/ocultar contraseña, opción de recordar sesión e indicador de modo online/offline.
- **`RegistroScreen`**: Alta de voluntarios (nombre, teléfono, brigada/rol, correo y contraseña).

### 2. Gestión de Casos (`presentation/screens/casos/` & `detalle/`)
- **`CasosScreen`**: Pantalla principal con:
  - Buscador reactivo por nombre provisorio o ubicación.
  - Filtros rápidos por urgencia: **Todos**, **Alta**, **Media**, **Baja**.
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
  - Nombre provisorio, especie (foco felino), cantidad de animales, edad estimada, estado visible y temperamento.
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
  - Información del voluntario activo y cierre de sesión.

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

## 📦 Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Fashisus07/PERF-App.git
   cd PERF-App
   ```

2. **Instalar las dependencias del proyecto:**
   ```bash
   npm install
   ```

3. **Verificar que no existan errores de tipos en TypeScript:**
   ```bash
   npx tsc --noEmit
   ```

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

Si necesitás compilar los módulos nativos completos de Android (para probar permisos del sistema operativo al 100%):

```bash
npm run android
# O equivalentemente:
npx expo run:android
```

> **Nota para compilación nativa:** Requiere tener instalado el JDK 21 y el Android SDK. Genera la carpeta nativa `android/` en tu entorno local.

---

## 🧪 Pruebas de Capacidades Nativas en Emulador

- **Cámara:** El emulador de Android utiliza por defecto una cámara virtual animada. En un dispositivo físico capturará fotos reales y las almacenará en el almacenamiento temporal de la app.
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
| `npm run android` | Compila y ejecuta el proyecto nativo en Android. |
| `npm run ios` | Compila y ejecuta el proyecto nativo en iOS (requiere macOS). |
| `npm run web` | Inicia el servidor para previsualización web en el navegador. |
| `npx tsc --noEmit` | Ejecuta el comprobador de tipos de TypeScript sobre todo el código fuente. |

---

## 👥 Equipo de Desarrollo

Proyecto desarrollado en el marco del **Trabajo Práctico Obligatorio (TPO)** de la materia **Desarrollo de Aplicaciones I** - UADE.

- **Mateo Mirarchi**
- **Facundo Pérez Espinosa**
- **Tobías**
