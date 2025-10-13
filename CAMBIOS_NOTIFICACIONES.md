# 🔄 Cambios en Sistema de Notificaciones

## Fecha: 2025-10-12
## Objetivo: Solucionar problema de notificaciones que quedan como "pendiente"

---

## 📋 Problema Identificado

Las notificaciones quedaban permanentemente como "pendiente" en la base de datos porque:

1. **Creación inicial**: Al enviar una notificación, se creaba un reporte con estatus "pendiente"
2. **Intento de respuesta**: Cuando el usuario respondía, se intentaba crear un NUEVO reporte
3. **Validación**: El sistema rechazaba la creación por duplicado (409 - ya contestada)
4. **Resultado**: El reporte original nunca se actualizaba de "pendiente" a "aceptado"/"rechazado"

---

## ✅ Solución Implementada

### Backend

#### 1. **Modificado: `routes/reportes.routes.js`**

**Cambio principal**: UPDATE en lugar de CREATE cuando existe un reporte pendiente

**Lógica nueva** (líneas 71-143):
```javascript
let reporteGuardado;
let fueActualizado = false;

if (notificationId) {
  const reporteExistente = await Reporte.findOne({ notificationId });

  if (reporteExistente) {
    // Si ya fue contestada (no está pendiente), rechazar
    if (reporteExistente.estatus !== 'pendiente') {
      return res.status(409).json({
        error: "Esta notificación ya fue contestada por otro residente",
        yaContestada: true
      });
    }

    // ✅ Si está PENDIENTE, ACTUALIZAR en lugar de crear nuevo
    reporteExistente.estatus = estatus.toLowerCase();
    reporteExistente.autorizadoPor = residenteNombre || 'Usuario';
    reporteExistente.autorizadoPorId = residenteId || null;
    reporteExistente.tiempo = new Date();
    reporteGuardado = await reporteExistente.save();
    fueActualizado = true;
  } else {
    // No existe, crear uno nuevo
    reporteGuardado = await Reporte.create({...});
  }
}
```

**Respuesta actualizada**:
```javascript
res.status(200).json({
  success: true,
  mensaje: `Notificación procesada como ${estatus.toUpperCase()}`,
  reporte: reporteGuardado,
  puertaAbierta: estatus.toLowerCase() === 'aceptado',
  accion: fueActualizado ? 'actualizado' : 'creado'  // NUEVO
});
```

#### 2. **Endpoint existente mejorado**: `/api/notifications/pending/:fraccId/:residencia`

Ya existía y funciona correctamente. Retorna:
- Todas las notificaciones con estatus "pendiente"
- Security hash recalculado
- Info completa incluyendo `autorizadoPorId`

---

### Frontend (iOS y Android)

#### 1. **Modificado: `lib/core/services/app_initialization_service.dart`**

**Agregado**: Sincronización de notificaciones pendientes al INICIAR la app

```dart
// NUEVO método
void _syncPendingNotificationsInBackground() {
  Future.delayed(const Duration(milliseconds: 2000), () async {
    try {
      print('🔄 AppInit: Sincronizando notificaciones pendientes al iniciar...');
      await AppLifecycleService().checkPendingNotifications();
    } catch (e) {
      print('⚠️ Error sincronizando notificaciones al iniciar: $e');
    }
  });
}

// Llamado en initializeServices()
Future<bool> initializeServices() async {
  try {
    await StorageService().initialize();
    // ... otros servicios
    _initializeSocketInBackground();
    _syncPendingNotificationsInBackground();  // ⬅️ NUEVO
    return true;
  } catch (e) {
    return false;
  }
}
```

#### 2. **Modificado: `lib/core/services/app_lifecycle_service.dart`**

**Cambio**: Método `_checkPendingNotifications()` ahora es **público** (`checkPendingNotifications()`)

```dart
// ANTES: Future<void> _checkPendingNotifications() async {
// AHORA:  Future<void> checkPendingNotifications() async {
```

Esto permite que sea llamado tanto:
- Al **resumir** la app (AppLifecycleState.resumed)
- Al **iniciar** la app (desde AppInitializationService)

**Funcionalidad existente que se mantiene**:
- Fetch de notificaciones pendientes del backend
- Filtrado de notificaciones contestadas por el usuario actual
- Muestra solo notificaciones que el usuario no ha visto

---

## 🔄 Flujo Completo Actualizado

### Escenario 1: Usuario abre la app normalmente

1. ✅ App inicia → `initializeServices()`
2. ✅ Se ejecuta `_syncPendingNotificationsInBackground()` (delay 2s)
3. ✅ Llama a `checkPendingNotifications()`
4. ✅ Hace GET a `/api/notifications/pending/:fraccId/:residencia`
5. ✅ Backend retorna notificaciones con estatus "pendiente"
6. ✅ Frontend filtra las que el usuario actual ya contestó
7. ✅ Muestra notificaciones pendientes que no ha visto

### Escenario 2: Usuario responde a una notificación

1. Usuario presiona "Aceptar" o "Rechazar"
2. ✅ App envía POST a `/api/reportes/:fraccId/crear`
3. ✅ Backend busca reporte con ese `notificationId`
4. ✅ Si existe y está "pendiente" → **ACTUALIZA** (no crea nuevo)
5. ✅ Si no existe → Crea nuevo reporte
6. ✅ Emite socket `notificacionContestada` con `autorizadoPorId`
7. ✅ Otros dispositivos reciben el evento y ocultan la notificación

### Escenario 3: Usuario ignora la notificación push

1. Notificación push llega pero el usuario no la abre
2. ✅ Reporte queda como "pendiente" en BD
3. Más tarde, usuario abre la app
4. ✅ `checkPendingNotifications()` se ejecuta al iniciar
5. ✅ Fetch de pendientes → encuentra la notificación
6. ✅ La muestra como notificación local
7. Usuario puede responder
8. ✅ Backend actualiza el reporte de "pendiente" a "aceptado"/"rechazado"

---

## 🎯 Beneficios

✅ **No más duplicados**: Un solo reporte por notificationId
✅ **Sincronización automática**: Al iniciar y al resumir la app
✅ **Estado consistente**: Los reportes siempre tienen el estatus correcto
✅ **Funciona offline**: Si el usuario responde sin internet, se procesa después
✅ **Multi-dispositivo**: Otros dispositivos se sincronizan vía Socket.IO
✅ **UX mejorada**: No se pierden notificaciones si el usuario ignora el push

---

## 📝 Archivos Modificados

### Backend
- ✅ `routes/reportes.routes.js` (UPDATE en lugar de CREATE)

### Frontend iOS
- ✅ `lib/core/services/app_initialization_service.dart` (sync al iniciar)
- ✅ `lib/core/services/app_lifecycle_service.dart` (método público)

### Frontend Android
- ✅ `lib/core/services/app_initialization_service.dart` (sync al iniciar)
- ✅ `lib/core/services/app_lifecycle_service.dart` (método público)

---

## 🔙 Cómo Revertir

Si algo sale mal, los backups están en:

```bash
# Backend
/Users/tagle/Documents/IngresosBackend/routes/reportes.routes.js.backup
/Users/tagle/Documents/IngresosBackend/routes/notification.routes.js.backup

# iOS
/Users/tagle/Documents/EskayserIOS/lib/core/services/app_initialization_service.dart.backup
/Users/tagle/Documents/EskayserIOS/lib/core/services/app_lifecycle_service.dart.backup

# Android
/Users/tagle/Documents/eskayserandroid/lib/core/services/app_initialization_service.dart.backup
/Users/tagle/Documents/eskayserandroid/lib/core/services/app_lifecycle_service.dart.backup
```

Para revertir:
```bash
# Restaurar backend
cp routes/reportes.routes.js.backup routes/reportes.routes.js

# Restaurar iOS
cp lib/core/services/app_initialization_service.dart.backup lib/core/services/app_initialization_service.dart
cp lib/core/services/app_lifecycle_service.dart.backup lib/core/services/app_lifecycle_service.dart
```

---

## 🧪 Testing Recomendado

1. **Test 1**: Enviar notificación, no abrirla, abrir app → Debe aparecer
2. **Test 2**: Responder notificación → Debe actualizarse el estatus
3. **Test 3**: Dos dispositivos, uno responde → El otro debe sincronizar
4. **Test 4**: Modo avión, responder, activar internet → Debe procesar
5. **Test 5**: Verificar logs de backend para confirmar UPDATE vs CREATE

---

## 📊 Monitoreo

Buscar en logs del backend:
- `🔄 Actualizando reporte pendiente` → UPDATE exitoso
- `✅ Reporte actualizado exitosamente` → Confirmación
- Respuesta con `"accion": "actualizado"` → Se usó UPDATE
- Respuesta con `"accion": "creado"` → Se creó nuevo (normal para primera respuesta)

---

**Implementado por**: Claude Code  
**Revisado por**: [Pendiente]  
**Status**: ✅ Implementado - Pendiente pruebas
