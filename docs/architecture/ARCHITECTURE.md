# Arquitectura de Promexa — Documento Técnico

> Documento técnico parcial de construcción de software.  
> Cubre decisiones arquitectónicas, flujos clave y modelo de datos.

---

## 1. Visión General del Sistema

Promexa es una plataforma social con marketplace y mensajería en tiempo real.  
El sistema se compone de **tres servicios independientes** y **cuatro capas de persistencia**:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                        │
│                     Next.js 15 · TypeScript                     │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / WSS
          ┌──────────────────┴──────────────────────┐
          │                                         │
   REST API (NestJS)                    WebSocket Gateway
   puerto 3001                          /chat (Socket.IO)
          │                                         │
          └──────────────────┬──────────────────────┘
                             │
          ┌──────────────────┼──────────────────────┐
          │                  │                      │
    PostgreSQL            Neo4j                   Redis
   (transaccional)     (grafo social)          (WS broker)
                             │
                      ML Service
                   FastAPI · Python 3.14
                   scikit-learn · pandas
```

---

## 2. Diagrama de Secuencia — Envío de Mensaje en Tiempo Real

El siguiente diagrama muestra el flujo completo de un mensaje de chat, incluyendo
persistencia, entrega en tiempo real e idempotencia:

```
Cliente Alice          Gateway (NestJS)         PostgreSQL         Cliente Bob
     │                       │                      │                   │
     │  sendMessage(WS ack)  │                      │                   │
     │──────────────────────>│                      │                   │
     │                       │  1. Verifica JWT     │                   │
     │                       │  2. Verifica amistad │                   │
     │                       │  3. Valida payload   │                   │
     │                       │─── findUnique ───────>│                   │
     │                       │    (idempotencia)    │                   │
     │                       │<── null (nuevo) ─────│                   │
     │                       │─── message.create ──>│                   │
     │                       │<── {id, text, ...} ──│                   │
     │                       │                      │                   │
     │                       │──── emit('receiveMessage') ─────────────>│
     │  { ok: true, message }│                      │                   │
     │<──────────────────────│                      │                   │
     │                       │                      │                   │

Caso idempotencia (reintento con mismo clientMessageId):
     │  sendMessage(mismo id)│                      │                   │
     │──────────────────────>│                      │                   │
     │                       │─── findUnique ───────>│                   │
     │                       │<── {existing msg} ───│                   │
     │  { ok: true, message }│  (sin INSERT)        │                   │
     │<──────────────────────│                      │                   │
```

---

## 3. Diagrama de Secuencia — Recomendaciones ML con Degradación Elegante

```
Cliente            NestJS API           ML Service (Python)
   │                   │                      │
   │  GET /users/...   │                      │
   │──────────────────>│                      │
   │                   │─ POST /recommendations/users ──>│
   │                   │   AbortSignal.timeout(1500ms)   │
   │                   │                                 │
   │                   │  [CASO A — ML responde a tiempo]│
   │                   │<── scores (ML) ─────────────────│
   │                   │   usa scores del modelo         │
   │<── usuarios ordenados por ML ────────────────────   │
   │                   │                                 │
   │                   │  [CASO B — ML lento / caído]    │
   │                   │    timeout 1500ms               │
   │                   │    catch → heurística local     │
   │<── usuarios por heurística (mutual friends, tags) ──│
   │                   │                                 │
```

---

## 4. Modelo de Datos Simplificado

### Entidades principales (PostgreSQL)

```
User
├── id           UUID PK
├── name         String
├── email        String UNIQUE
├── passwordHash String
├── role         Enum(USER, ADMIN)
├── profileType  Enum(personal, business)
├── avatar       String?
├── bio          String?
└── isVerified   Boolean

Post
├── id           UUID PK
├── authorId     UUID → User
├── content      String
├── mediaUrl     String?
└── createdAt    DateTime

Product (Marketplace)
├── id           UUID PK
├── sellerId     UUID → User
├── name         String
├── price        Decimal
├── category     String
├── status       Enum(Disponible, Reservado, Vendido)
└── image        String?

Message (Chat)
├── id                UUID PK
├── senderId          UUID → User
├── recipientId       UUID → User
├── text              String (max 5000)
├── clientMessageId   String? UNIQUE (idempotencia)
├── productId         String? (snapshot marketplace)
├── productName       String?
└── createdAt         DateTime

FriendRequest
├── id           UUID PK
├── senderId     UUID → User
├── receiverId   UUID → User
└── status       Enum(PENDING, ACCEPTED, REJECTED)

Notification
├── id           UUID PK
├── userId       UUID → User
├── type         String
├── message      String
└── dismissed    Boolean
```

### Índice clave para idempotencia de mensajes

```sql
UNIQUE INDEX ON Message(senderId, clientMessageId)
```

Esto garantiza exactamente una inserción por `clientMessageId`, incluso con 20
peticiones concurrentes con el mismo ID (verificado en `realtime.test.cjs`).

---

## 5. Decisiones de Diseño

### 5.1 Monorepo con pnpm workspaces

**Decisión**: Un único repositorio con tres apps (`web`, `api`, `ml-service`).

**Razón**: Facilita la consistencia de tipos TypeScript entre frontend y backend,
y permite un único `docker-compose.yml` para el entorno de desarrollo.

**Trade-off**: El `node_modules` hoistado puede causar conflictos de versiones;
se mitiga con `pnpm-workspace.yaml` que aísla dependencias por workspace.

### 5.2 WebSockets con adaptador Redis opcional

**Decisión**: El adaptador Redis (`@socket.io/redis-adapter`) es opcional y se
carga condicionalmente con `REDIS_WS_ENABLED=true`.

**Razón**: En desarrollo local, Redis no es necesario para la mensajería. En
producción con múltiples instancias del API, Redis es el bus de mensajes que
sincroniza los sockets entre instancias.

**Resiliencia**: Si Redis cae en producción, `realtimeHealth.available = false`
y el sistema emite `presenceUnavailable` a los clientes — el chat de texto sigue
funcionando, solo la presencia en línea se desactiva.

### 5.3 ML Service como dependencia opcional

**Decisión**: El servicio ML es un proceso separado (FastAPI/Python), no un
módulo del backend NestJS.

**Razón**: Python tiene un ecosistema ML mucho mejor (scikit-learn, pandas,
numpy). La separación permite escalar el servicio ML independientemente.

**Resiliencia**: `AbortSignal.timeout(1500)` en cada llamada. Si el ML service
no responde en 1.5 s, el API calcula las recomendaciones con una heurística
local en memoria, sin degradar la experiencia del usuario.

### 5.4 Validación en capas (Defense in Depth)

```
Capa 1: ValidationPipe global → DTOs con class-validator (HTTP)
Capa 2: Validación manual en WebSocket Gateway (no pasa por pipe)
Capa 3: Validación de contenido en StorageService (sharp metadata)
Capa 4: Reglas de negocio en Services (bcrypt limit, CQS, etc.)
```

---

## 6. Análisis de Dependencias Transitivas y Riesgos

### 6.1 Cadenas transitivas críticas (API — NestJS)

| Dependencia directa | Transitiva clave | Versión | Riesgo |
|---|---|---|---|
| `sharp ^0.35.5` | `libvips` (binding nativo C) | ≥ 8.16 | **Medio** — compilación nativa; falla en ARM sin prebuild. Mitigación: usar imagen Docker con prebuild incluido. |
| `@nestjs/platform-express ^10.x` | `multer ^1.4.5` | 1.4.5-lts | **Bajo** — versión LTS; vulnerabilidades históricas de path traversal ya mitigadas por `StorageService.validateKey`. |
| `@nestjs/websockets ^10.x` | `socket.io ^4.x` → `engine.io ^6.x` | engine.io 6.x | **Bajo** — `engine.io` históricamente tuvo CVEs de DoS; v6 está parchado. |
| `@prisma/client ^5.x` | `@prisma/engines` (binarios Rust) | 5.22.x | **Bajo** — binarios descargados en `postinstall`; requiere acceso a internet en build. En CI puede ser lento. |
| `redis ^6.x` | `@node-redis/client` | 6.x | **Bajo** — librería oficial de Redis; mantenida activamente. |
| `bcryptjs ^2.4.3` | ninguna (pure JS) | 2.4.3 | **Muy bajo** — sin dependencias nativas; última versión de 2020, estable. |

### 6.2 Cadenas transitivas críticas (ML Service — Python)

| Dependencia directa | Transitiva clave | Riesgo |
|---|---|---|
| `scikit-learn ≥1.4` | `numpy ≥1.26`, `scipy ≥1.x` | **Bajo** — versiones actuales con soporte activo. |
| `fastapi ≥0.110` | `starlette ≥0.36`, `pydantic ≥2.6` | **Bajo** — ecosistema muy activo. |
| `psycopg2-binary ≥2.9.9` | `libpq` (binding C de PostgreSQL) | **Medio** — binario compilado para plataforma específica; en producción usar `psycopg2` (source) para mayor control. |
| `neo4j ≥5.18` | `pyarrow` (opcional) | **Bajo** — driver oficial de Neo4j. |

### 6.3 Análisis de licencias

| Dependencia | Licencia | Compatible con uso comercial |
|---|---|---|
| NestJS, Express, Prisma | MIT | ✅ Sí |
| Socket.IO, Redis adapter | MIT | ✅ Sí |
| sharp | Apache 2.0 | ✅ Sí |
| bcryptjs | MIT | ✅ Sí |
| FastAPI, Starlette | MIT | ✅ Sí |
| scikit-learn, numpy | BSD-3-Clause | ✅ Sí |
| `@aws-sdk/client-s3` | Apache 2.0 | ✅ Sí |

Todas las dependencias directas y transitivas principales son **MIT, Apache 2.0 o BSD**,
compatibles con uso comercial sin restricciones de copyleft.

---

## 7. Convenciones de Código

- **TypeScript strict**: `"strict": true` en `tsconfig.json`
- **Módulos NestJS**: un módulo por dominio de negocio (auth, users, chat, posts, marketplace)
- **DTOs como contratos**: toda entrada HTTP pasa por DTO con `class-validator`
- **No ORM directo en controllers**: los controllers solo llaman a services
- **Logging**: `Logger` de NestJS (no `console.log`) en producción
- **Variables de entorno**: validadas en arranque con `ConfigService`; nunca `process.env` directo en módulos

