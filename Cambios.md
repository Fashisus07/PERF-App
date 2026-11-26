# Registro Integral de Cambios y Refactorización · PERF Móvil

**Proyecto:** PERF Móvil (`PERF-App`)  
**Materia:** Desarrollo de Aplicaciones I — UADE (2026)  
**Arquitectura:** Clean Architecture (MVVM) + Offline-First con Expo (React Native), TypeScript, SQLite y Supabase.  
**Fecha de generación:** 24 de noviembre de 2026  

---

## Índice General

1. [Resumen Ejecutivo de la Intervención](#1-resumen-ejecutivo-de-la-intervención)
2. [Fase 1: Auditoría e Infraestructura de Base de Datos y Supabase](#2-fase-1-auditoría-e-infraestructura-de-base-de-datos-y-supabase)
3. [Fase 2: Triage y Priorización Multicriterio de Casos (Capa de Dominio)](#3-fase-2-triage-y-priorización-multicriterio-de-casos-capa-de-dominio)
4. [Fase 3: Seguridad, Autenticación y Control de Acceso (Auth + RLS + Storage)](#4-fase-3-seguridad-autenticación-y-control-de-acceso-auth--rls--storage)
5. [Fase 4: Motor de Sincronización Bidireccional Offline-First (SyncEngine)](#5-fase-4-motor-de-sincronización-bidireccional-offline-first-syncengine)
6. [Fase 5: Notificaciones Locales y Turnos Veterinarios](#6-fase-5-notificaciones-locales-y-turnos-veterinarios)
7. [Fase 6: Corrección de Errores Críticos Reportados](#7-fase-6-corrección-de-errores-críticos-reportados)
   - 7.1. Flujo de Autenticación, Recuperación de Clave y Confirmación de Correo
   - 7.2. Visualización del Estado Operativo en la Ficha del Animal
   - 7.3. Persistencia de Cambios de Estado en `WebDatabase.ts`
8. [Fase 7: Sistema de Aprobación de Voluntarios por Correo y Panel de Coordinación](#8-fase-7-sistema-de-aprobación-de-voluntarios-por-correo-y-panel-de-coordinación)
9. [Matriz de Archivos Creados y Modificados](#9-matriz-de-archivos-creados-y-modificados)
10. [Verificación y Cobertura de Pruebas Automatizadas](#10-verificación-y-cobertura-de-pruebas-automatizadas)
11. [Fase 8: Seguridad sin clave maestra, animales por caso y mejoras (noviembre 2026)](#11-fase-8-seguridad-sin-clave-maestra-animales-por-caso-y-mejoras-noviembre-2026)

---

## 1. Resumen Ejecutivo de la Intervención

A partir de la devolución formal de los profesores para la Etapa 2 y los requerimientos funcionales solicitados durante el ciclo de desarrollo, se ejecutó una refactorización integral del repositorio:

- **Evolución del modelo de triage:** Se sustituyó el cálculo lineal por cantidad de días por un algoritmo multicriterio basado en gravedad clínica, vulnerabilidad del animal y umbral temporal configurable.
- **Backend Supabase Real y Seguro:** Se reemplazaron sesiones simuladas y almacenamiento local inseguro por autenticación JWT persistida con `AsyncStorage`, políticas estrictas de seguridad a nivel de filas (**RLS**) y almacenamiento privado de fotografías en **Supabase Storage**.
- **Sincronización Bidireccional sin Pérdida:** Se implementó un motor con cola idempotente basada en UUID v4, fusión parcial a nivel de campos (*Delta Merge*) para evitar sobreescrituras destructivas (*Last-Write-Wins*), y registros inmutables (*append-only*) para historiales y turnos.
- **Flujo de Gobernanza y Validación de Voluntarios:** Se resolvió la limitación del registro de nuevos voluntarios mediante el envío automático de correos HTML a coordinadores con enlaces de acción de un solo uso para **Aprobar** o **Rechazar/Borrar**, acompañado de un panel de coordinación in-app en tiempo real.

---

## 2. Fase 1: Auditoría e Infraestructura de Base de Datos y Supabase

### Hallazgos de la Auditoría
- La base SQLite local utilizaba identificadores incrementales simples en lugar de UUIDs, provocando riesgo de colisiones entre dispositivos sin conexión.
- No existía control de concurrencia ni políticas RLS en base remota.
- Las fotografías se almacenaban únicamente de forma local en el dispositivo.

### Acciones Ejecutadas
- **Definición del Esquema Remoto en PostgreSQL (`supabase/schema.sql`):**
  - Creación de tablas espejadas: `perfiles`, `casos`, `centros_veterinarios`, `turnos`, `eventos_historial`, `conflictos` y `fotos_caso`.
  - Habilitación de **Row Level Security (RLS)** en todas las tablas con revocación total de privilegios al rol `anon`.
  - Función de seguridad `public.es_voluntario_activo()` y `public.es_coordinador()` para aislar datos sensibles (coordenadas GPS, datos de tránsitos, fichas médicas).
  - Triggers de auditoría y protección para evitar auto-asignación de roles privilegiados.
  - Creación del bucket privado `casos-fotos` con políticas que exigen sesión autenticada para lectura mediante URLs firmadas (`createSignedUrl`).

---

## 3. Fase 2: Triage y Priorización Multicriterio de Casos (Capa de Dominio)

### Actualización del Modelo de Dominio
- **Archivo:** `src/domain/models/Caso.ts`
- Incorporación de los atributos:
  - `gravedad_clinica`: `'CRITICA' | 'MODERADA' | 'LEVE' | 'SANA'`
  - `vulnerabilidad`: `'LACTANTE_SIN_MADRE' | 'SIN_TRANSITO' | 'EN_TRATAMIENTO' | 'ESTABLE'`
  - `nivel_prioridad`: `'URGENTE' | 'ATENCION' | 'AL_DIA'`
  - `puntaje_prioridad`: valor numérico ponderado para ordenamiento determinístico.

### Caso de Uso Puro: `CalcularPrioridadCasoUseCase`
- **Archivo:** `src/domain/usecases/CalcularPrioridadCasoUseCase.ts`
- **Reglas de Negocio Implementadas:**
  1. **Exclusión Absoluta:** Casos en estado `ADOPTADO` o `FALLECIDO` reciben prioridad `AL_DIA` y puntaje neutro (0 pts).
  2. **Prioridad 1 (URGENTE):**
     - Si `gravedad_clinica === 'CRITICA'` (+500 pts).
     - O si `vulnerabilidad === 'LACTANTE_SIN_MADRE'` (+450 pts).
     - O si `vulnerabilidad === 'SIN_TRANSITO'` (+400 pts).
     - O si los días en espera superan el umbral configurable (default: 15 días, configurable en Ajustes).
  3. **Prioridad 2 (ATENCIÓN):**
     - Si `gravedad_clinica === 'MODERADA'` (+250 pts).
     - O si `vulnerabilidad === 'EN_TRATAMIENTO'` (+200 pts).
     - O si alcanzó el 70% del umbral de días.
  4. **Prioridad 3 (AL DÍA):** Animales estables dentro de los plazos normales.

### Actualización de Interfaz de Usuario
- **Formulario de Rescate (Paso 2):** Modificado `src/presentation/screens/rescate/PasoDatos.tsx` incorporando selectores táctiles accesibles (chips mínimos de 48dp) para gravedad y vulnerabilidad.
- **Componentes Visuales:**
  - `src/presentation/components/CasoCard.tsx`: Muestra el puntaje y la etiqueta de motivo (ej. *"URGENTE • Crítico"*, *"ATENCIÓN • Moderado"*, *"URGENTE • +16 días"*).
  - `src/presentation/components/UrgenciaBadge.tsx`: Adaptado con paleta accesible de contraste y texto semántico claro.

---

## 4. Fase 3: Seguridad, Autenticación y Control de Acceso (Auth + RLS + Storage)

### Cliente Supabase y Persistencia Local
- **Archivo:** `src/data/remote/supabaseClient.ts`
- Configuración del cliente Supabase con:
  - Adapter `AsyncStorage` para almacenar la sesión JWT en disco local (permitiendo abrir la app y operar en modo avión sin perder credenciales).
  - Activación de `detectSessionInUrl: Platform.OS === 'web'` para auto-detección de tokens de recuperación de contraseña y confirmación.
  - Exportación de cliente de administración `adminSupabase` respaldado por `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` para operaciones privilegiadas de coordinación.

### Repositorio de Autenticación
- **Archivo:** `src/data/remote/SupabaseAuthRepository.ts`
- Métodos implementados:
  - `iniciarSesion(email, clave)`: Valida credenciales, comprueba estado de aprobación del voluntario y rechaza ingresos si la cuenta está pendiente.
  - `registrar(datos)`: Crea usuario en `auth.users`, genera `token_aprobacion` único, almacena metadatos y dispara la notificación por correo a coordinadores.
  - `recuperarClave(email)`: Dispara correo de reseteo con redirección dinámica al origen de la app.
  - `cambiarClave(nuevaClave)`: Actualiza la contraseña en Supabase Auth validando un mínimo de 6 caracteres.
  - `obtenerVoluntarioActual()`: Soporta hidratación híbrida (token remoto válido o perfil cacheado offline).
  - `cerrarSesion()`: Limpia tokens locales y remotos.

---

## 5. Fase 4: Motor de Sincronización Bidireccional Offline-First (SyncEngine)

### Componentes de Sincronización
- **Archivos:**
  - `src/data/remote/sincronizacion/MotorSincronizacion.ts`
  - `src/data/remote/sincronizacion/DeltaMerge.ts`
  - `src/data/remote/sincronizacion/SincronizacionFotos.ts`
  - `src/data/remote/sincronizacion/AlmacenSqlite.ts`
  - `src/data/remote/sincronizacion/ServidorSupabase.ts`

### Principios del Motor
1. **Identificadores UUID v4 e Idempotencia:**
   - Todo registro generado fuera de línea (`casos`, `turnos`, `eventos_historial`) genera su UUID en el cliente antes de persistir en SQLite.
   - La cola `operaciones_pendientes` utiliza operaciones `UPSERT` (`onConflict: 'id'`) garantizando que reintentos de red no generen registros duplicados.
2. **Fusión Parcial sin Sobrescritura (*Delta Merge*):**
   - En actualizaciones de `casos`, solo se empaquetan los campos efectivamente modificados (`changed_fields`).
   - La función remota `public.aplicar_cambios_caso` fusiona propiedad por propiedad respetando marcas temporales. Si el Voluntario A editó la ubicación y el Voluntario B editó la gravedad clínica, ambos cambios conviven sin pisarse.
   - En caso de discrepancias concurrentes en un mismo campo, el valor descartado queda auditado en la tabla `conflictos`.
3. **Inmutabilidad de Turnos y Evoluciones Clínicas:**
   - `eventos_historial` y `turnos` se tratan como colecciones *append-only*. Inserciones concurrentes de dos voluntarios conviven cronológicamente.
4. **Sincronización de Fotografías en Dos Fases:**
   - *Fase A (Local):* Imagen guardada en almacenamiento local con `foto_sync_status = 'PENDING'`.
   - *Fase B (Remota):* Al detectar red (`NetInfo`), se sube el archivo a `casos-fotos/{caso_id}/{uuid}.jpg` en Supabase Storage, se actualiza `foto_remote_path` y se pasa a `'SYNCED'`. Si la subida falla, la ficha del caso se sincroniza igualmente sin bloquear la operación.
5. **Descarga de Cambios Remotos (*Pull Sync*):**
   - Método `pullRemoteChanges`: descarga novedades con `updated_at > last_synced_at` e hidrata la base SQLite local.

---

## 6. Fase 5: Notificaciones Locales y Turnos Veterinarios

### Gestión de Turnos y Alertas Android
- **Archivos:**
  - `src/data/local/RecordatoriosNotificaciones.ts`
  - `src/domain/services/RecordatorioTurnos.ts`
- **Mejoras Implementadas:**
  - Configuración explícita de canal Android (`setNotificationChannelAsync`) con importancia `MAX`, vibración y sonido para compatibilidad con Android 8.0+ (API 26+).
  - Manejo preventivo de permisos en tiempo de ejecución sin provocar cierres inesperados.
  - Almacenamiento del identificador devuelto por Expo (`notification_id`) en la tabla `turnos` de SQLite para permitir su cancelación (`cancelScheduledNotificationAsync`) si el turno se cumple o si el animal es adoptado.

---

## 7. Fase 6: Corrección de Errores Críticos Reportados

### 7.1. Flujo de Autenticación, Recuperación de Clave y Confirmación de Correo
- **Problema previo:** Al intentar recuperar clave o confirmar el correo desde Supabase, el enlace redirigía al inicio de sesión sin permitir ingresar una nueva contraseña, y arrojaba avisos recurrentes de "sin conexión".
- **Solución implementada:**
  - Creación de la pantalla `src/presentation/screens/auth/CambiarClaveScreen.tsx` con validaciones de contraseña (mínimo 6 caracteres, confirmación coincidente, visibilidad alternable con ícono de ojo).
  - En `src/presentation/navigation/AppNavigator.tsx`, detección del evento `PASSWORD_RECOVERY` y captura de parámetros `#type=recovery` o `?type=recovery` en la URL para redirigir inmediatamente a `CambiarClaveScreen`.
  - Vinculación del botón *"¿Olvidaste tu contraseña?"* en `LoginScreen.tsx` que se encontraba sin acción asignada.

### 7.2. Visualización del Estado Operativo en la Ficha del Animal
- **Problema previo:** En `DetalleCasoScreen.tsx`, el apartado "Estado Operativo" renderizaba la totalidad de los 6 estados de la aplicación como chips acumulados, generando confusión visual sobre el estado real del animal.
- **Solución implementada:**
  - Modificación de `src/presentation/screens/detalle/DetalleCasoScreen.tsx` reemplazando el mapeo de los 6 chips por una tarjeta individual y destacada que muestra **estrictamente el estado activo actual** del caso (con su ícono, descripción explicativa, color distintivo y el botón de acción *"Cambiar estado"*).

### 7.3. Persistencia de Cambios de Estado en `WebDatabase.ts`
- **Problema previo:** Al ejecutar un cambio de estado en la versión Web/Desktop, la app confirmaba el cambio pero al volver a la ficha se restablecía el estado anterior sin persistir.
- **Causa raíz:** En `WebDatabase.ts`, la función `evalWhere` asumía que `params[0]` correspondía al `id` de la cláusula WHERE. Al procesar `UPDATE casos SET estado_caso = ?, sync_status = 'PENDING', updated_at = ? WHERE id = ?;`, `params[0]` era el valor de `estado_caso`, provocando que la búsqueda de fila por ID fallara silenciosamente.
- **Solución implementada:**
  - En `WebDatabase.ts`, se incorporó el conteo de marcadores `?` en la cláusula SET para particionar adecuadamente `setParams` y `whereParams`. Los cambios de estado ahora se persisten de inmediato en `localStorage`.

---

## 8. Fase 7: Sistema de Aprobación de Voluntarios por Correo y Panel de Coordinación

### Necesidad del Negocio
Al registrar una cuenta nueva, Supabase dejaba al usuario con `aprobado: false`, impidiendo el ingreso hasta que un coordinador lo habilitara. Sin embargo, no existía mecanismo para que los coordinadores se enteraran ni pudieran aprobar o rechazar al postulante.

### Solución Diseñada e Implementada

#### 1. Notificación Automática por Correo a Coordinadores
- Al registrarse un voluntario, el sistema consulta los coordinadores activos en Supabase y les envía un correo HTML con diseño institucional de PERF:
  - Ficha del postulante: Nombre, Email, Teléfono con enlace directo a WhatsApp (`https://wa.me/...`), Zona, Brigada y Recursos disponibles.
  - **Botón "ACEPTAR Y HABILITAR VOLUNTARIO":** Enlace directo con token de un solo uso.
  - **Botón "RECHAZAR Y BORRAR SOLICITUD":** Enlace directo con token de un solo uso.
- **Archivo:** `src/data/remote/NotificacionesCoordinadoresService.ts`

#### 2. Pantalla de Procesamiento de Acciones (`ProcesarSolicitudScreen.tsx`)
- Al abrir los enlaces del correo (en navegador móvil o de escritorio), la aplicación detecta los parámetros `accion=aprobar_voluntario` o `accion=rechazar_voluntario`.
- Muestra una interfaz de procesamiento con retroalimentación visual inmediata:
  - **Aprobado:** Mensaje de éxito informando que el voluntario ya puede iniciar sesión.
  - **Rechazado:** Mensaje confirmando la eliminación completa de los datos.

#### 3. Panel de Coordinación In-App (`AprobacionVoluntariosScreen.tsx`)
- En `AjustesScreen.tsx`, los usuarios con `rol === 'coordinador'` disponen de la tarjeta **"Panel de Coordinación"** con una insignia roja que indica la cantidad de solicitudes pendientes en tiempo real.
- Permite:
  - Ver el listado detallado de voluntarios pendientes.
  - Abrir una conversación de WhatsApp con un toque para entrevistarlos.
  - Botón **"Aprobar voluntario"** (habilita la cuenta en Supabase de inmediato).
  - Botón **"Rechazar"** (elimina completamente al usuario de `auth.users` y `public.perfiles` con confirmación previa).

#### 4. Borrado Completo en Supabase ante Rechazo
- Si la solicitud es rechazada, se ejecuta la eliminación de `auth.users` vía API administrativa y borrado en `public.perfiles`, garantizando que no persista información del postulante rechazado en la base de datos.

---

## 9. Matriz de Archivos Creados y Modificados

| Tipo | Archivo | Responsabilidad / Descripción del Cambio |
| :--- | :--- | :--- |
| **Creado** | `src/domain/usecases/CalcularPrioridadCasoUseCase.ts` | Caso de uso puro de triaje multicriterio (gravedad + vulnerabilidad + días). |
| **Creado** | `src/data/remote/NotificacionesCoordinadoresService.ts` | Servicio de armado de plantillas HTML y despacho de correos a coordinadores con tokens de acción. |
| **Creado** | `src/presentation/screens/ajustes/AprobacionVoluntariosScreen.tsx` | Panel de gestión y aprobación/rechazo de postulaciones de voluntarios para coordinadores. |
| **Creado** | `src/presentation/screens/ajustes/ProcesarSolicitudScreen.tsx` | Pantalla de procesamiento y feedback visual al hacer clic en los enlaces de acción del correo. |
| **Creado** | `src/presentation/screens/auth/CambiarClaveScreen.tsx` | Pantalla de restablecimiento seguro de contraseña vía Supabase Auth. |
| **Creado** | `supabase/schema.sql` | Script SQL completo: tablas, índices, triggers, funciones RPC (`aprobar_voluntario`, `rechazar_voluntario`) y políticas RLS. |
| **Creado** | `src/domain/usecases/__tests__/CalcularPrioridadCasoUseCase.test.ts` | Pruebas unitarias para todas las combinaciones de triaje y descarte de adoptados/fallecidos. |
| **Creado** | `src/data/remote/__tests__/NotificacionesCoordinadores.test.ts` | Pruebas unitarias para el armado de correos a coordinadores y URLs firmadas. |
| **Creado** | `src/data/remote/sincronizacion/__tests__/DeltaMerge.test.ts` | Pruebas de fusión parcial campo a campo y resolución de conflictos. |
| **Creado** | `src/data/remote/sincronizacion/__tests__/ColaOffline.test.ts` | Pruebas unitarias de encolado, reintentos e idempotencia en desconexión. |
| **Modificado** | `src/data/local/WebDatabase.ts` | Corrección del parser de sentencias SQL `UPDATE` para separar parámetros de SET y WHERE. |
| **Modificado** | `src/presentation/screens/detalle/DetalleCasoScreen.tsx` | Corrección visual de "Estado Operativo": muestra únicamente el estado actual del animal. |
| **Modificado** | `src/data/remote/SupabaseAuthRepository.ts` | Incorporación de métodos de coordinación (`obtenerVoluntariosPendientes`, `aprobarVoluntario`, `rechazarVoluntario`), cambio de clave y mapeo de rol. |
| **Modificado** | `src/data/remote/supabaseClient.ts` | Configuración de cliente Supabase con AsyncStorage, detección de URL y exportación de `adminSupabase`. |
| **Modificado** | `src/domain/repositories/AuthRepository.ts` | Extensión de interfaz de repositorio con métodos de coordinación y tipos de solicitud. |
| **Modificado** | `src/domain/models/Ajustes.ts` | Incorporación de tipos `RolVoluntario`, `rol`, `aprobado` y tokens de postulación. |
| **Modificado** | `src/presentation/screens/ajustes/AjustesScreen.tsx` | Integración del Panel de Coordinación con contador en tiempo real para usuarios coordinadores. |
| **Modificado** | `src/presentation/navigation/AppNavigator.tsx` | Registro de pantallas de coordinación y recuperación de clave; intercepción de deep links de acción. |
| **Modificado** | `src/presentation/screens/auth/LoginScreen.tsx` | Vinculación del evento de recuperación de contraseña y optimización de feedback. |
| **Modificado** | `src/presentation/screens/auth/RegistroScreen.tsx` | Integración con el nuevo flujo de notificación por correo y estado de espera. |
| **Modificado** | `.env` | Incorporación de clave de servicio `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` para operaciones administrativas. |

---

## 10. Verificación y Cobertura de Pruebas Automatizadas

Se ejecutó la suite completa de verificación técnica:

1. **Chequeo de Tipos TypeScript (`npx tsc --noEmit`):**
   ```bash
   npx tsc --noEmit
   # Resultado: 0 errores de compilación
   ```

2. **Ejecución de Pruebas Unitarias (`npm test`):**
   ```text
   PASS src/domain/usecases/__tests__/CalcularPrioridadCasoUseCase.test.ts (5.063 s)
   PASS src/data/remote/sincronizacion/__tests__/DeltaMerge.test.ts (5.143 s)
   PASS src/data/remote/__tests__/NotificacionesCoordinadores.test.ts (5.191 s)
   PASS src/data/remote/sincronizacion/__tests__/ColaOffline.test.ts (5.220 s)

   Test Suites: 4 passed, 4 total
   Tests:       21 passed, 21 total
   Snapshots:   0 total
   Time:        6.719 s
   Ran all test suites.
   ```

---

## 11. Fase 8: Seguridad sin clave maestra, animales por caso y mejoras (noviembre 2026)

Trabajo hecho sobre `feature/integracion-main-perfiles` (PR #1) después de la Fase 7. Todo está probado con `npx jest` (78 tests) y, lo visual, en el emulador y en un APK instalado desde cero. El detalle y el estado de cada pendiente están en el `README.md` (sección "Checklist del proyecto").

### 11.1. Seguridad: la app ya no lleva la clave `service_role`
- Se sacó `SUPABASE_SERVICE_ROLE_KEY` y `adminSupabase` de `supabaseClient.ts`: todo lo `EXPO_PUBLIC_*` queda dentro del APK.
- Aprobar y rechazar voluntarios desde la app usa las funciones SQL `aprobar_voluntario` / `rechazar_voluntario` (solo para el coordinador, con su sesión).
- El correo a los coordinadores y el enlace de aprobación pasaron a **Edge Functions** (`supabase/functions/notificar-voluntario` y `gestionar-voluntario`), con token de un solo uso generado en el servidor. Necesitan los secrets `RESEND_API_KEY` y `APP_URL`.
- Migración `20261125000100_cerrar_acceso_anonimo.sql`: el rol `anon` no tiene permisos sobre ninguna tabla (segunda barrera además de RLS).

### 11.2. Animales por caso (ficha sanitaria individual)
- `AnimalCaso` + tabla local `animales` sincronizada con la tabla de Supabase: cada caso nuevo crea sus animales; los de otros celulares se bajan al sincronizar.
- La ficha sanitaria se edita animal por animal (selector cuando el caso tiene varios) y la del caso es el **resumen del grupo** (`resumenSanidad`: lo peor de cada animal).
- Migración `20261126000000_cargar_animales_de_casos_existentes.sql` para los casos que ya existían.

### 11.3. Prioridad: una sola regla, y con "última revisión"
- `CalcularPrioridadCasoUseCase` es la única fuente; `calcularUrgencia()` y el nuevo `prioridadDeCaso()` de `Caso.ts` la usan. Se borró `domain/services/PrioridadCaso.ts` (no lo usaba nadie).
- La prioridad **se calcula al mostrar** con el umbral de Ajustes (antes las tarjetas leían el nivel guardado, que quedaba viejo con los días).
- `fechaUltimaRevision` se deriva del historial (visita, nota, tratamiento, desparasitación, vacunación o cirugía; no cuentan cambio de tránsito ni adopción) y los días se cuentan desde ahí.

### 11.4. Turnos y veterinarias
- Recordatorio configurable: 30 min, 1 h, 2 h, 1 día o 2 días (antes solo 24 h / 2 h, y solo uno se guardaba de verdad). El valor por defecto se elige en Ajustes.
- Las veterinarias las carga y edita el administrador desde el Directorio Veterinario (`EditarClinicaScreen`, `CentrosVeterinariosService`) y se bajan al sincronizar. Cada una tiene **sus horarios**: agendar ofrece solo esos y el caso de uso rechaza reservar fuera de ellos.

### 11.5. Correcciones
- **Sincronización:** al editar un caso la cola mandaba claves en camelCase (`sanidad`, `estadoVisible`) que el servidor ignoraba, así que esos cambios nunca llegaban a Supabase. Ahora se encola el caso completo y el motor manda solo los campos que cambiaron.
- Canal de notificaciones: se quitó `sound: 'default'`, que Android interpretaba como un archivo inexistente.
- Los botones de filtro de urgencia no se corren al pasar de "Todos" a "Mis casos".
- Se quitó el botón "Filtrar" (igual que en `main`) y el botón de agendar turno al guardar un rescate.

### 11.6. Esquema de Supabase: una sola fuente
`supabase/schema.sql` se **genera** a partir de `supabase/migrations/` con `node supabase/generar-schema.js`; un test (`SchemaSupabase.test.ts`) falla si se desalinean. Se comprobó en PGlite que las migraciones, en orden, corren sobre una base vacía. La versión anterior de `schema.sql` queda en el historial de git.

### 11.7. Para unir con `feature/triaje-dinamico-zonas-20casos`
La rama de Facu (un commit, 45 archivos) y esta se pisan en 15 archivos. **Criterio acordado: donde hicimos lo mismo, manda lo de Facu y lo nuestro se monta encima.**

| Zona | Archivos en conflicto | Qué hacer |
|---|---|---|
| Prioridad | `CalcularPrioridadCasoUseCase.ts` (+ su test), `Caso.ts` | Base: su triaje médico (`sanidad`, `factoresMedicos`). Agregar encima `fechaUltimaRevision` y `prioridadDeCaso()`. |
| Ficha sanitaria | `EditarSanidadScreen.tsx`, `DetalleCasoScreen.tsx` | Base: su edición de ficha. Adaptar el selector de animal y la lista por animal. |
| Guardado de casos | `CasoRepositoryImpl.ts`, `CasoRepository.ts`, `CasoMapper.ts`, `useCasoStore.ts` | Conservar lo suyo y sumar animales, `actualizarAnimal` y las lecturas con `SQL_CASO_CON_REVISION`. |
| Multizona y perfil | `SelectorZonas.tsx`, `PerfilVoluntarioScreen.tsx`, `RegistroScreen.tsx`, `AppHeader.tsx`, `AjustesScreen.tsx` | Queda su versión. |
| Fotos | `CasoOfflineCard.tsx` (y su `fotoCaso.ts`) | Queda su `fotoCasoSource`. |

---

*Documento generado automáticamente como constancia de la refactorización arquitectónica y funcional de la aplicación PERF Móvil.*
