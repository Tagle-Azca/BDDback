# Arquitectura de 3 Bases de Datos

## Vision General

El sistema ahora utiliza tres bases de datos especializadas, cada una con su propio proposito:

```
┌─────────────────────────────────────────────────────────┐
│                   VISITANTE LLEGA                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │  Reporte Orchestrator      │
         └───────────┬───────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
    ┌─────────┐            ┌──────────┐
    │ MongoDB │            │ Cassandra│
    │         │            │          │
    │ Buscar  │            │ Guardar  │
    │ Visitante│           │ Reporte  │
    │         │            │ Historico│
    │ +Contador│           └──────────┘
    └─────┬───┘
          │
          ▼
    ┌──────────┐
    │ ChromaDB │
    │          │
    │ Indexar  │
    │ Pendiente│
    └──────────┘
          │
          ▼
    Notificacion al Propietario
          │
          ▼
    Propietario Responde
          │
     ┌────┴────┐
     │         │
     ▼         ▼
┌─────────┐ ┌──────────┐
│ MongoDB │ │ Cassandra│
│         │ │          │
│ Actualizar│ │Actualizar│
│ Contador│ │ Estado   │
└─────────┘ └──────────┘
     │
     ▼
┌──────────┐
│ ChromaDB │
│          │
│ Eliminar │
│(Ya no    │
│pendiente)│
└──────────┘
```

## MongoDB - Registro de Visitantes

### Proposito
Mantener un registro unico de cada visitante con contador de visitas

### Modelo: Visitante

```javascript
{
  nombre: "Juan Perez",
  nombreNormalizado: "juan perez",  // Para busquedas
  fraccId: ObjectId("..."),
  primeraFoto: "https://...",

  // CONTADORES
  totalVisitas: 5,
  visitasAceptadas: 4,
  visitasRechazadas: 1,

  // ANALISIS
  casasVisitadas: ["15", "23"],
  motivosFrecuentes: [
    { motivo: "Entrega", cantidad: 3 },
    { motivo: "Visita personal", cantidad: 2 }
  ],

  // TEMPORAL
  primeraVisita: ISODate("2025-11-01"),
  ultimaVisita: ISODate("2025-12-01")
}
```

### Operaciones

```javascript
// Buscar o crear visitante
const visitante = await Visitante.buscarOCrear(
  "Juan Perez",
  fraccId,
  fotoUrl
);

// Incrementar contador
await visitante.incrementarVisita("15", "Entrega");

// Registrar respuesta
await visitante.registrarRespuesta(true); // aceptado
```

---

## Cassandra - Historial Completo de Reportes

### Proposito
Almacenar TODOS los reportes para siempre con consultas rapidas por fecha

### Tabla: reportes_history

```cql
CREATE TABLE reportes_history (
  reporte_id uuid,
  fracc_id uuid,
  date text,              -- '2025-12-01' (partition key)
  timestamp timestamp,
  numero_casa text,
  nombre text,
  motivo text,
  foto text,
  estatus text,          -- pendiente/aceptado/rechazado
  autorizado_por text,
  notification_id text,
  PRIMARY KEY ((fracc_id, date), timestamp, reporte_id)
) WITH CLUSTERING ORDER BY (timestamp DESC);
```

### Consultas

```javascript
// Obtener historial de una casa (ultimos 30 dias)
const historial = await cassandraService.obtenerReportesPorCasa(
  fraccId,
  "15",    // numero de casa
  30,      // dias
  100      // limite
);

// Resultado:
[
  {
    reporteId: "...",
    timestamp: "2025-12-01T10:30:00Z",
    numeroCasa: "15",
    nombre: "Juan Perez",
    motivo: "Entrega",
    estatus: "aceptado",
    autorizadoPor: "Maria Gonzalez"
  },
  // ... mas reportes
]
```

---

## ChromaDB - Reportes Pendientes

### Proposito
Solo reportes esperando respuesta del propietario. Se elimina al aceptar/rechazar.

### Coleccion: visitantes_eskayser

```javascript
{
  id: "reporte_id_mongo",
  document: "Juan Perez Entrega de paquete",
  metadata: {
    reporteId: "...",
    nombre: "Juan Perez",
    motivo: "Entrega de paquete",
    foto: "https://...",
    fraccId: "...",
    numeroCasa: "15",
    fecha: "2025-12-01T10:30:00Z",
    estatus: "pendiente"   // SIEMPRE pendiente en ChromaDB
  }
}
```

### Ciclo de vida

```javascript
// 1. Crear reporte -> Se indexa en ChromaDB
await Reporte.create({ estatus: 'pendiente' });
// ChromaDB: INDEXA

// 2. Propietario acepta/rechaza -> Se elimina de ChromaDB
await Reporte.findByIdAndUpdate(id, { estatus: 'aceptado' });
// ChromaDB: ELIMINA

// 3. Buscar pendientes -> Solo en ChromaDB
const pendientes = await visitanteSearchService.buscarSimilares(...);
// ChromaDB: BUSCA (rapido, semantico)
```

---

## Flujo Completo: Visitante Llega

### 1. Endpoint: POST /api/fraccionamientos/:fraccId/casas/:numero/visitas

```javascript
// routes/visitas.routes.js

const resultado = await reporteOrchestrator.crearReporte({
  fraccId,
  numeroCasa: "15",
  nombre: "Juan Perez",
  motivo: "Entrega",
  foto: "https://..."
});

// resultado = {
//   reporte: { _id, nombre, estatus: 'pendiente', ... },
//   visitante: { totalVisitas: 3, visitasAceptadas: 2, ... },
//   esVisitaRepetida: true
// }
```

### 2. Reporte Orchestrator Service

```javascript
// services/reporte-orchestrator.service.js

async crearReporte(data) {
  // PASO 1: MongoDB - Buscar/crear visitante + incrementar contador
  const visitante = await Visitante.buscarOCrear(
    data.nombre,
    data.fraccId,
    data.foto
  );
  await visitante.incrementarVisita(data.numeroCasa, data.motivo);

  // PASO 2: MongoDB - Crear reporte
  const reporte = await Reporte.create({
    ...data,
    estatus: 'pendiente'
  });

  // PASO 3: Hook automatico -> Cassandra + ChromaDB
  // Ver modelo reporte.model.js linea 39-52

  return { reporte, visitante, esVisitaRepetida: visitante.totalVisitas > 1 };
}
```

### 3. Hooks Automaticos (Modelo Reporte)

```javascript
// models/reporte.model.js

reportesSchema.post('save', async function(doc) {
  // CASSANDRA: Guardar en historial
  await cassandraService.guardarReporte(doc);

  // CHROMADB: Indexar solo si esta pendiente
  if (doc.estatus === 'pendiente') {
    await visitanteSearchService.indexarVisitante(doc);
  }
});
```

### 4. Respuesta al Cliente

```json
{
  "success": true,
  "reporteId": "673f32e7f4c84a0e0dfabe5a",
  "visitante": {
    "totalVisitas": 3,
    "esNuevo": false,
    "estadisticas": {
      "nombre": "Juan Perez",
      "totalVisitas": 3,
      "visitasAceptadas": 2,
      "visitasRechazadas": 0,
      "casasVisitadas": ["15", "23"],
      "tasaAceptacion": "66.7"
    }
  }
}
```

---

## Flujo Completo: Propietario Responde

### 1. Endpoint: PUT /api/reportes/responder/:reporteId

```javascript
// routes/reportes.routes.js

await reporteOrchestrator.responderReporte(
  reporteId,
  true,                    // aceptado
  "Maria Gonzalez",        // autorizadoPor
  "residente123"           // autorizadoPorId
);
```

### 2. Reporte Orchestrator Service

```javascript
// services/reporte-orchestrator.service.js

async responderReporte(reporteId, aceptado, autorizadoPor, autorizadoPorId) {
  // PASO 1: MongoDB - Buscar reporte
  const reporte = await Reporte.findById(reporteId);

  // PASO 2: MongoDB - Buscar visitante y actualizar contador
  const visitante = await Visitante.findOne({
    fraccId: reporte.fraccId,
    nombreNormalizado: reporte.nombre.toLowerCase()
  });
  await visitante.registrarRespuesta(aceptado);

  // PASO 3: MongoDB - Actualizar reporte
  reporte.estatus = aceptado ? 'aceptado' : 'rechazado';
  reporte.autorizadoPor = autorizadoPor;
  await reporte.save();

  // PASO 4: Hook automatico -> Cassandra + ChromaDB
  return reporte;
}
```

### 3. Hooks Automaticos (Actualizacion)

```javascript
// models/reporte.model.js

reportesSchema.post('findOneAndUpdate', async function(doc) {
  // CASSANDRA: Actualizar estado
  await cassandraService.actualizarReporte(doc);

  // CHROMADB: Eliminar (ya no esta pendiente)
  if (doc.estatus !== 'pendiente') {
    await visitanteSearchService.eliminarVisitante(doc._id);
  }
});
```

---

## Consultas Especializadas

### Obtener Historial Completo (Cassandra)

```javascript
// Ultimos 90 dias de visitas a una casa
const historial = await reporteOrchestrator.obtenerHistorialCompleto(
  fraccId,
  "15",   // numeroCasa
  90      // dias
);

// Cassandra devuelve RAPIDO (optimizado para series temporales)
```

### Buscar Reportes Pendientes (ChromaDB)

```javascript
// Busqueda semantica de pendientes
const pendientes = await visitanteSearchService.buscarSimilares(
  "Juan",    // nombre parcial
  "",
  fraccId,
  10
);

// ChromaDB encuentra: "Juan Perez", "Juana Maria", "Juan Carlos"
// Solo los que estan PENDIENTES
```

### Estadisticas de Visitante (MongoDB)

```javascript
const stats = await reporteOrchestrator.obtenerEstadisticasVisitante(
  fraccId,
  "Juan Perez"
);

// Resultado:
{
  nombre: "Juan Perez",
  totalVisitas: 8,
  visitasAceptadas: 7,
  visitasRechazadas: 1,
  casasVisitadas: ["15", "23", "42"],
  motivosFrecuentes: [
    { motivo: "Entrega", cantidad: 5 },
    { motivo: "Visita personal", cantidad: 3 }
  ],
  tasaAceptacion: "87.5"
}
```

---

## Nuevos Endpoints

### Registrar Visita

```
POST /api/fraccionamientos/:fraccId/casas/:numero/visitas
Body: FormData { nombre, motivo, FotoVisita }

Response:
{
  "success": true,
  "reporteId": "...",
  "visitante": {
    "totalVisitas": 3,
    "esNuevo": false,
    "estadisticas": { ... }
  }
}
```

### Responder Reporte

```
PUT /api/reportes/responder/:reporteId
Body: {
  "aceptado": true,
  "autorizadoPor": "Maria Gonzalez",
  "autorizadoPorId": "residente123"
}

Response:
{
  "success": true,
  "message": "Visita aceptada",
  "reporte": { ... }
}
```

### Historial de Casa

```
GET /api/reportes/historial/:fraccId/:numeroCasa?days=30

Response:
{
  "success": true,
  "total": 45,
  "historial": [
    {
      "reporteId": "...",
      "timestamp": "2025-12-01T10:30:00Z",
      "nombre": "Juan Perez",
      "motivo": "Entrega",
      "estatus": "aceptado",
      "autorizadoPor": "Maria Gonzalez"
    },
    // ... mas reportes
  ]
}
```

---

## Ventajas de esta Arquitectura

### MongoDB
- Busqueda rapida de visitantes por nombre normalizado
- Contadores siempre actualizados
- Queries complejas para estadisticas

### Cassandra
- Almacenamiento ilimitado de reportes
- Consultas rapidas por rango de fechas
- Nunca se pierde informacion

### ChromaDB
- Busqueda semantica de pendientes
- Rapido para encontrar similares
- Auto-limpieza (solo pendientes)

---

## Sincronizacion Automatica

Todo esta sincronizado via Mongoose hooks:

```javascript
// models/reporte.model.js

// AL CREAR
post('save') -> Cassandra.guardar() + ChromaDB.indexar()

// AL ACTUALIZAR
post('findOneAndUpdate') -> Cassandra.actualizar() + ChromaDB.eliminar()

// AL ELIMINAR
post('findOneAndDelete') -> ChromaDB.eliminar()
```

No necesitas llamar manualmente a las 3 bases de datos. El orchestrator y los hooks lo hacen automaticamente.

---

## Setup

1. Instalar Cassandra:
```bash
docker run -d -p 9042:9042 --name cassandra cassandra:latest
```

2. Instalar dependencia:
```bash
npm install cassandra-driver
```

3. Configurar .env (ya esta agregado)

4. Iniciar servidor:
```bash
npm run dev
```

Veras en los logs:
```
MongoDB: Conectado
ChromaDB: Coleccion "visitantes_eskayser" inicializada
Cassandra: Conectado exitosamente
Cassandra: Keyspace 'eskayser' verificado/creado
Cassandra: Todas las tablas verificadas/creadas
```

---

## Resumen

**3 Bases de Datos, 1 Objetivo:**

- **MongoDB**: Quien es el visitante + cuantas veces viene
- **Cassandra**: Historial completo de TODO
- **ChromaDB**: Solo los que estan esperando respuesta

Todo sincronizado automaticamente. Tu solo usas el Reporte Orchestrator.
