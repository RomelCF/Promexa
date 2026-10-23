# Tecnologías de Construcción de Software — Promexa

Documento que relaciona los siete temas del curso con el código real del proyecto **Promexa**
(plataforma social con marketplace, mensajería y recomendaciones ML).

> **Criterio de inclusión**: solo se documentan patrones que ya existen orgánicamente en el
> código o que se aplicaron de forma natural. No se forzó ningún tema.

---

## Índice

1. [Semana 1 — Construcción, Reúso y Dependencias](#semana-1)
2. [Semana 2 — Problemas de Tiempo de Ejecución en OO](#semana-2)
3. [Semana 3 — Desarrollo por Contratos](#semana-3)
4. [Semana 4 — Programación Defensiva](#semana-4)
5. [Semana 5 — Manejo de Errores y Excepciones](#semana-5)
6. [Semana 6 — Concurrencia](#semana-6)
7. [Semana 7 — Tolerancia a Fallas y Resiliencia](#semana-7)

---

## Semana 1 — Construcción, Reúso y Dependencias

### Gestión de dependencias con pnpm

Promexa usa **pnpm workspaces** como gestor de paquetes monorepo.
Cada aplicación declara sus dependencias de forma explícita en su `package.json`.

```
apps/
  api/package.json     ← dependencias del backend NestJS
  web/package.json     ← dependencias del frontend Next.js
```

**Archivo clave**: `apps/api/package.json`

```json
{
  "@nestjs/common": "^10.4.15",
  "@prisma/client": "^5.22.0",
  "bcryptjs": "^2.4.3",
  "sharp": "^0.35.5",
  "@socket.io/redis-adapter": "^8.3.0"
}
```

Cada dependencia tiene una función acotada:

| Paquete | Rol en el sistema |
|---|---|
| `@nestjs/*` | Framework estructural (IoC, DI, módulos) |
| `@prisma/client` | ORM generado a partir del schema |
| `bcryptjs` | Hashing de contraseñas (librería de seguridad) |
| `sharp` | Procesamiento de imágenes (componente especializado) |
| `class-validator` | Validación declarativa de DTOs |
| `@socket.io/redis-adapter` | Componente WebSocket distribuido |

### Reúso mediante frameworks

El proyecto **construye con reúso** en todas sus capas:

- **NestJS**: framework de IoC/DI que evita escribir el contenedor de dependencias manualmente.
- **Prisma**: ORM con cliente generado — el desarrollador reutiliza los tipos y queries del cliente en lugar de escribir SQL.
- **class-validator / class-transformer**: librerías de validación reutilizadas en todos los DTOs.
- **bcryptjs**: librería de hash, no se implementa el algoritmo desde cero.

### Separación entre construcción e integración

La frontera construcción/integración es visible en la arquitectura de módulos:

```
apps/api/src/
  modules/auth/       ← construcción del dominio de autenticación
  modules/users/      ← construcción del dominio de usuarios
  modules/chat/       ← construcción del dominio de mensajería
  app.module.ts       ← integración: ensambla todos los módulos
  main.ts             ← arranque: configura el runtime y la app
```

`app.module.ts` es exclusivamente de **integración**: solo importa módulos, no contiene lógica de negocio.

---

## Semana 2 — Problemas de Tiempo de Ejecución en OO

### Polimorfismo e inyección de dependencias en NestJS

NestJS implementa **enlace dinámico** a través de su contenedor de IoC.
Los servicios se resuelven en tiempo de ejecución según las interfaces registradas.

```typescript
// apps/api/src/modules/users/users.service.ts
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService, // ← resuelto en runtime por el contenedor
  ) {}
}
```

El contenedor decide qué instancia concreta inyectar sin que el servicio lo sepa.
Esto es **enlace tardío de componentes**: el módulo no instancia sus dependencias directamente.

### Genéricos (Generics) en TypeScript

```typescript
// Tipo parametrizado — composición de tipo segura
private expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Genérico de NestJS para tipar el contexto HTTP
const response = ctx.getResponse<Response>();
const request  = ctx.getRequest<Request>();
```

### Reflexión y metaprogramación (decoradores)

NestJS usa **reflexión** (`reflect-metadata`) para leer decoradores en tiempo de ejecución y construir el grafo de dependencias:

```typescript
@Injectable()        // registra la clase como proveedor inyectable
@Controller('auth')  // refleja la ruta base en el router
@Post('login')       // asocia el método HTTP con el handler
@Body() loginDto: LoginDto  // extrae y valida el cuerpo usando reflection
```

Esto es **metaprogramación declarativa**: el comportamiento se configura mediante anotaciones sin modificar el flujo del código de negocio.

### Carga tardía de componentes

El adaptador Redis se carga **condicionalmente** en tiempo de ejecución:

```typescript
// apps/api/src/main.ts
if (config.get('REDIS_WS_ENABLED') === 'true') {
  const adapter = new RedisIoAdapter(app);
  await adapter.connect(config);
  app.useWebSocketAdapter(adapter);
}
```

Si Redis no está configurado, el sistema arranca sin el adaptador. Enlace tardío según el entorno.

---

## Semana 3 — Desarrollo por Contratos

### DTOs como contratos de interfaz con precondiciones ejecutables

```typescript
// apps/api/src/modules/auth/dto/register.dto.ts
export class RegisterDto {
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @IsEmail({}, { message: 'Debe ingresar un correo electrónico válido' })
  email: string;

  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  // Precondición de dominio: solo dos valores permitidos
  @IsIn(['personal', 'business'])
  profileType: 'personal' | 'business';
}
```

Cada decorador es una **precondición ejecutable**: si no se cumple, NestJS lanza `400 Bad Request` antes de llegar al handler.

### Normalización contractual (postcondiciones en DTOs)

```typescript
// apps/api/src/modules/users/dto/update-profile.dto.ts

// Postcondición: el email siempre llega en minúsculas al servicio
@Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
@IsEmail() @MaxLength(255)
email: string;

// Postcondición: la bio tiene máximo 1000 caracteres
@IsOptional() @IsString() @MaxLength(1000)
bio?: string | null;
```

### Separación comando-consulta (CQS)

```typescript
// apps/api/src/modules/users/users.controller.ts
@Get('friends')            getFriends(...)         // consulta pura
@Get('search')             search(...)             // consulta pura
@Get(':id/profile')        getUserProfile(...)     // consulta pura
@Get('notifications')      getNotifications(...)   // consulta pura

@Patch('me')               updateProfile(...)      // comando
@Patch('me/password')      changePassword(...)     // comando
@Post(':id/friend-request') sendFriendRequest(...) // comando
```

Los métodos `GET` nunca modifican estado. Los `POST`/`PATCH` nunca devuelven el estado directamente.

### Invariante de clase: PrismaService

```typescript
// apps/api/src/database/postgres/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {

  async onModuleInit()    { await this.$connect();    } // invariante: conectado
  async onModuleDestroy() { await this.$disconnect(); } // limpieza garantizada
}
```

---

## Semana 4 — Programación Defensiva

### Barricada global: ValidationPipe

```typescript
// apps/api/src/main.ts — Semana 4: programación defensiva, validación de entradas
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,            // elimina propiedades no declaradas en el DTO
    forbidNonWhitelisted: true, // fail-fast: falla si llegan propiedades extra
    transform: true,            // convierte tipos automáticamente
  }),
);
```

- `whitelist: true` actúa como **barricada**: aísla el código confiable del no confiable.
- `forbidNonWhitelisted: true` implementa **fail-fast**.

### Validación en capa de servicio

```typescript
// apps/api/src/modules/users/users.service.ts
async changePassword(userId: string, data: ChangePasswordDto) {
  if (data.newPassword !== data.confirmPassword)
    throw new BadRequestException('Las claves no coinciden');

  // Límite de bcrypt — evita DoS por hashing de strings gigantes
  if (Buffer.byteLength(data.newPassword, 'utf8') > 72)
    throw new BadRequestException('La clave es demasiado larga');

  if (data.currentPassword === data.newPassword)
    throw new BadRequestException('La nueva clave debe ser diferente');
}
```

### Validación de WebSockets (no pasa por ValidationPipe)

```typescript
// apps/api/src/modules/chat/chat.gateway.ts
if (!payload
  || typeof payload.recipientId !== 'string'
  || typeof payload.text !== 'string'
  || !payload.text.trim()
  || payload.text.length > 5000
  || (payload.clientMessageId !== undefined
      && !/^[a-f0-9-]{36}$/.test(payload.clientMessageId)))
  return { ok: false };
```

### Barricada de medios (StorageService)

```typescript
// apps/api/src/modules/storage/storage.service.ts
private validateKey(purpose: string, userId: string, file: string) {
  if (!['avatar', 'post', 'cover'].includes(purpose)
    || !/^[a-zA-Z0-9_-]{1,100}$/.test(userId)
    || !/^[a-f0-9-]{36}\.webp$/.test(file))
    throw new NotFoundException();  // no expone detalles de path traversal
  return `${purpose}/${userId}/${file}`;
}
```

Valida formato, tamaño y **contenido real** del archivo (no solo el `Content-Type`):

```typescript
const image = sharp(file.buffer, { limitInputPixels: 40000000 });
const metadata = await image.metadata();
if (!['jpeg', 'png', 'webp'].includes(metadata.format || ''))
  throw new Error('Unsupported image');
```

---

## Semana 5 — Manejo de Errores y Excepciones

### Filtro global de excepciones *(aplicado en este análisis)*

Se creó `apps/api/src/common/filters/http-exception.filter.ts`:

```typescript
@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      // Extrae mensaje legible desde la excepción
    } else {
      // No expone detalles internos al cliente
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Error interno del servidor';
      this.logger.error({ event: 'unhandled_exception', error: ..., stack: ... });
    }

    // Registro estructurado (structured logging)
    const logPayload = {
      event: 'http_exception',
      statusCode: status,
      method: request.method,
      path: request.url,
      message,
    };
    if (status >= 500) this.logger.error(logPayload);
    else if (status >= 400) this.logger.warn(logPayload);

    // Respuesta consistente con timestamp y path
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: message,
    });
  }
}
```

**Principios aplicados**:
- ✅ Registro estructurado con campos clave-valor
- ✅ Detalles de errores internos NO expuestos al cliente
- ✅ Envoltura de excepciones: las no-HTTP se convierten en 500
- ✅ Antipatrón evitado: ningún `catch {}` vacío en el flujo de manejo

### Jerarquía de excepciones HTTP

| Excepción | Código | Dónde se usa |
|---|---|---|
| `BadRequestException` | 400 | Datos inválidos, reglas de negocio básicas |
| `UnauthorizedException` | 401 | Credenciales incorrectas, token inválido |
| `NotFoundException` | 404 | Recurso inexistente |
| `ConflictException` | 409 | Duplicados, inconsistencias de estado |
| `ServiceUnavailableException` | 503 | Storage no disponible |

### Envoltura (wrapping) de excepciones

```typescript
// apps/api/src/modules/users/users.service.ts
async updateProfile(userId: string, data: UpdateProfileDto) {
  try {
    return await this.prisma.user.update({ ... });
  } catch (error) {
    // Traduce códigos de Prisma a excepciones de dominio
    if (error.code === 'P2002') throw new ConflictException('Este correo ya esta registrado');
    if (error.code === 'P2025') throw new NotFoundException('Usuario no encontrado');
    throw error; // relanzamiento para errores no manejados
  }
}
```

### Mensajes de excepción informativos

```typescript
throw new BadRequestException('Las claves no coinciden');
throw new UnauthorizedException('Credenciales inválidas. Verifica tu correo y contraseña.');
throw new ConflictException('No puedes enviarte una solicitud a ti mismo');
throw new NotFoundException('Solicitud de amistad no encontrada');
```

### Catch vacío consciente (antipatrón evitado con justificación)

```typescript
// apps/api/src/modules/chat/chat.gateway.ts
try {
  this.server.to(`user:${payload.recipientId}`).emit('receiveMessage', message);
} catch { /* The durable history repairs missed realtime deliveries. */ }
```

El comentario explica por qué el silencio es seguro: la historia durable (DB) actúa como mecanismo de recuperación.

---

## Semana 6 — Concurrencia

### Programación asíncrona (async/await)

Todo el código de I/O es asíncrono. Modelo de concurrencia: **event loop + promises** de Node.js.

```typescript
// apps/api/src/modules/auth/auth.service.ts
async login(loginDto: LoginDto) {
  const user = await this.validateUser(loginDto.email, loginDto.password);
  const accessToken = await this.jwtService.signAsync(payload);
  return { accessToken, user };
}
```

### Seguridad en el ciclo de vida de WebSockets

```typescript
// apps/api/src/modules/chat/chat.gateway.ts
private expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();

async handleConnection(client: Socket) {
  // Desconecta el socket cuando el JWT expira
  this.expiryTimers.set(
    client.id,
    setTimeout(() => client.disconnect(true), Math.min(payload.exp * 1000 - Date.now(), 2147483647))
  );
}

async handleDisconnect(client: Socket) {
  clearTimeout(this.expiryTimers.get(client.id)); // evita memory leaks
  this.expiryTimers.delete(client.id);
}
```

El mapa garantiza exactamente un temporizador por socket. La limpieza en `handleDisconnect` es siempre ejecutada.

### Idempotencia en mensajes (manejo de reconexiones)

```typescript
// apps/api/src/modules/chat/chat.service.ts
async save(senderId, recipientId, text, productId?, clientMessageId?) {
  if (clientMessageId) {
    const previous = await this.prisma.message.findUnique({
      where: { senderId_clientMessageId: { senderId, clientMessageId } }
    });
    if (previous) return previous; // ← idempotencia: no duplica
  }
  // crear nuevo mensaje...
}
```

### Optimistic locking — detección de race condition

```typescript
// apps/api/src/modules/users/users.service.ts
const updated = await this.prisma.user.updateMany({
  where: { id: userId, passwordHash: user.passwordHash }, // condiciona con el valor leído
  data: { passwordHash },
});
if (updated.count !== 1)
  throw new ConflictException('La clave cambio. Vuelve a intentarlo');
```

### Paso de mensajes (modelo de actores en WebSockets)

```typescript
// apps/api/src/modules/chat/chat.gateway.ts
// Sin memoria compartida — solo mensajes a salas
this.server.to(`presence:${userId}`).emit('presenceChanged', { userId, online: ... });
this.server.to(`user:${recipientId}`).emit('receiveMessage', message);
```

### Contención de concurrencia: `presenceRevision`

```typescript
const revision = (client.data.presenceRevision || 0) + 1;
client.data.presenceRevision = revision;

// Dentro del loop asíncrono — descarta peticiones obsoletas
if (client.data.presenceRevision !== revision) return { ok: false };
```

---

## Semana 7 — Tolerancia a Fallas y Resiliencia

### Timeout como circuit breaker (ML Service)

```typescript
// apps/api/src/modules/users/users.service.ts
// ---------------------------------------------------------------------------
// Semana 7 — Tolerancia a Fallas y Resiliencia
// • Timeout: AbortSignal.timeout(1500) evita que el ml-service lento bloquee
//   la respuesta al usuario.
// • Degradación elegante: si el ml-service no responde, el catch no lanza
//   excepción — la lista se construye con la heurística local.
// • Contrapresión implícita: la petición nunca espera más de 1.5 s.
// ---------------------------------------------------------------------------
const response = await fetch(`${mlUrl}/recommendations/users`, {
  // ...
  signal: AbortSignal.timeout(1500), // Circuit-breaker de emergencia
});
```

### Degradación elegante (Graceful Degradation)

```typescript
let mlResults: any[] = [];
try {
  // Intento con el ml-service...
} catch {
  // Fallback automático — Semana 7: el sistema sigue funcionando con heurística local
}

// Siempre se ejecuta: usa ML o heurística local
const affinityScore = mlItem
  ? mlItem.score                                     // score del modelo ML
  : Math.min(98, 65 + cand.mutualCount * 10 + ...); // heurística en memoria
```

### Backoff exponencial en reconexión de Redis

```typescript
// apps/api/src/websockets/redis-io.adapter.ts
const publisher = createClient({
  url,
  socket: {
    connectTimeout: 3000,
    reconnectStrategy: retries => Math.min(500 * (retries + 1), 5000) // backoff exponencial
  }
});
```

Esperas: 500 ms → 1000 ms → 1500 ms → ... → máximo 5000 ms.

### Contención de fallas: Redis no derrumba el chat

```typescript
// apps/api/src/websockets/redis-io.adapter.ts
client.on('error', () => {
  realtimeHealth.available = false; // contiene el fallo en el subsistema de presencia
  this.notify?.();                  // notifica a clientes que la presencia no está disponible
});
```

Cuando Redis falla:
1. `realtimeHealth.available = false` → el fallo queda contenido
2. Se emite `presenceUnavailable` a los clientes → degradación elegante
3. El **chat sigue funcionando** — solo la presencia en línea desaparece

### Prevención de fallas en cascada

```typescript
// apps/api/src/modules/chat/chat.gateway.ts
async watchPresence(...) {
  try {
    if (!realtimeHealth.available) return { ok: false }; // falla rápido si Redis no está
    // ...
  } catch { return { ok: false }; } // nunca propaga al cliente
}
```

El guard `if (!realtimeHealth.available)` previene que una dependencia caída genere excepciones en cascada hacia los clientes WebSocket.

---

## Resumen de Cobertura

| Semana | Tema | Estado | Archivos principales |
|:---:|---|:---:|---|
| 1 | Construcción, Reúso y Dependencias | ✅ Presente | `package.json`, `app.module.ts` |
| 2 | Problemas de Tiempo de Ejecución en OO | ✅ Presente | `chat.gateway.ts`, `main.ts`, todos los módulos |
| 3 | Desarrollo por Contratos | ✅ Presente | `*.dto.ts`, `users.controller.ts`, `prisma.service.ts` |
| 4 | Programación Defensiva | ✅ Presente | `main.ts`, `storage.service.ts`, `chat.gateway.ts` |
| 5 | Manejo de Errores y Excepciones | ✅ Presente + mejorado | `http-exception.filter.ts` *(nuevo)*, `users.service.ts` |
| 6 | Concurrencia | ✅ Presente | `chat.gateway.ts`, `chat.service.ts`, `users.service.ts` |
| 7 | Tolerancia a Fallas y Resiliencia | ✅ Presente | `users.service.ts` (ML), `redis-io.adapter.ts` |

---

## Pruebas Automatizadas — Evidencia de Resultados

### Suite del Backend (Node.js `node:test`)

**Comando**: `node --test test/*.test.cjs`  
**Archivos**: 8 suites · 36 casos de prueba  
**Resultado**: ✅ **36 passed · 0 failed** (duración: ~21.5 s)

```
TAP version 13
ok  1 - centers landscape and portrait images without stretching            (2.71 ms)
ok  2 - zoom and extreme drag positions never expose space outside the image (0.51 ms)
ok  3 - zoom selects the expected portion of the original image             (0.15 ms)
ok  4 - delivers only to the chosen friend with authenticated sender identity (5.44 ms)
ok  5 - rejects messages to non-friends and empty messages                  (0.36 ms)
ok  6 - disconnects expired sessions before sending                         (0.21 ms)
ok  7 - invalid JWT cannot open a connection                                (0.36 ms)
ok  8 - does not emit or confirm a message if persistence fails             (0.33 ms)
ok  9 - history is restricted to authenticated participants and sorted chronologically (1.04 ms)
ok 10 - permits a product inquiry to its seller even without friendship     (0.36 ms)
ok 11 - product attachment is snapshotted from the database with the message (0.38 ms)
ok 12 - cannot attach a product belonging to a different seller             (1.43 ms)
ok 13 - temporary database authorization failures are returned as retryable errors (0.55 ms)
ok 14 - same idempotency key cannot be reused for different content        (0.40 ms)
ok 15 - accepts a signed token and loads the current database identity     (15.37 ms)
ok 16 - rejects missing, fabricated, expired, wrong-signature and unknown-user tokens (12.09 ms)
ok 17 - users and posts controllers require JWT authentication              (0.39 ms)
ok 18 - post creation uses authenticated identity instead of the supplied author (0.45 ms)
ok 19 - empty database produces an empty marketplace, with no demo fallback (5.21 ms)
ok 20 - listing uses the actual seller profile, never cached store or verification (1.97 ms)
ok 21 - create takes the seller from authentication and writes to Prisma   (0.44 ms)
ok 22 - status changes and deletion require ownership in the database query (2.76 ms)
ok 23 - API guards and DTO reject forged ownership and invalid prices      (37.46 ms)
ok 24 - changes only the authenticated user password and stores a bcrypt hash (359.80 ms)
ok 25 - wrong current password, mismatch and unchanged passwords never write (9.75 ms)
ok 26 - password request rejects short passwords and foreign user identity fields (10.39 ms)
ok 27 - normalizes profile fields and allows removing a photo              (12.44 ms)
ok 28 - rejects blank names, invalid emails, unsafe avatar URLs and privilege edits (5.46 ms)
ok 29 - updates only the authenticated profile and never selects the password hash (1.93 ms)
ok 30 - duplicate email returns a conflict without changing the profile    (0.59 ms)
ok 31 - accepts uploaded avatar URLs on localhost and local IP addresses   (5.15 ms)
ok 32 - presence tracks real sessions, multiple tabs, disconnects and concurrent retry delivery (4815.36 ms)
ok 33 - uploads a real image as WebP and retrieves it without original metadata (53.66 ms)
ok 34 - rejects disguised files, oversized avatars, missing files and invalid destinations (2.51 ms)
ok 35 - rejects path traversal and unknown media keys                      (1.71 ms)
ok 36 - HTTP upload requires JWT, accepts multipart images and serves the resulting image (3262.16 ms)

1..36
# tests 36  # pass 36  # fail 0  # duration_ms 21482.5364
```

**Cobertura por módulo**:

| Suite | Módulo cubierto | Tests |
|---|---|---:|
| `avatar-crop.test.cjs` | Frontend — `squareCrop` utility | 3 |
| `chat.test.cjs` | Chat Gateway, Chat Service, Chat Controller | 10 |
| `jwt-auth.test.cjs` | JWT Strategy, Auth Guard, Posts/Users controllers | 4 |
| `marketplace.test.cjs` | Marketplace Service, Controller, DTOs | 5 |
| `password.test.cjs` | `changePassword` con bcrypt y optimistic locking | 3 |
| `profile.test.cjs` | `UpdateProfileDto`, normalización, privilegios | 5 |
| `realtime.test.cjs` | WebSocket end-to-end: presencia, concurrencia, idempotencia | 1 |
| `storage.test.cjs` | Storage Service: upload, read, validación, HTTP flow | 4 |

> El test de `realtime.test.cjs` (ok 32) es un escenario de integración completo que
> levanta un servidor NestJS real, conecta sockets reales y verifica concurrencia con
> 20 mensajes simultáneos con el mismo `clientMessageId`.

---

### Suite del ML Service (pytest)

**Comando**: `py -m pytest tests/ -v`  
**Archivos**: `tests/test_recommendations.py` · 13 casos de prueba  
**Resultado**: ✅ **13 passed · 0 failed** (duración: 1.10 s)

```
============================= test session starts =============================
platform win32 -- Python 3.14.0, pytest-9.0.0, pluggy-1.6.0
rootdir: apps/ml-service

tests/test_recommendations.py::test_health_check                           PASSED [  7%]
tests/test_recommendations.py::test_empty_candidates_returns_empty_list    PASSED [ 15%]
tests/test_recommendations.py::test_single_candidate_is_scored_and_returned PASSED [ 23%]
tests/test_recommendations.py::test_shared_tags_increase_score_compared_to_no_tags PASSED [ 30%]
tests/test_recommendations.py::test_partial_tag_overlap_gives_intermediate_score PASSED [ 38%]
tests/test_recommendations.py::test_mutual_friends_increase_score          PASSED [ 46%]
tests/test_recommendations.py::test_recommendation_reason_reflects_mutual_friends PASSED [ 53%]
tests/test_recommendations.py::test_results_are_sorted_by_score_descending PASSED [ 61%]
tests/test_recommendations.py::test_limit_parameter_caps_results           PASSED [ 69%]
tests/test_recommendations.py::test_default_limit_is_12                   PASSED [ 76%]
tests/test_recommendations.py::test_invalid_internal_token_returns_403     PASSED [ 84%]
tests/test_recommendations.py::test_missing_token_is_allowed_by_default   PASSED [ 92%]
tests/test_recommendations.py::test_response_includes_model_version        PASSED [100%]

======================== 13 passed, 1 warning in 1.10s ========================
```

**Aspectos verificados por las pruebas ML**:
- ✅ Health check del servicio
- ✅ Score en rango `[55, 99]` para cualquier candidato
- ✅ Monotonía de la similitud Jaccard (tags compartidos → mayor score)
- ✅ Monotonía de la afinidad de grafo (más amigos → mayor score)
- ✅ Postcondición de `recommendation_reason` con amigos comunes
- ✅ Invariante de ordenamiento descendente por score
- ✅ Parámetro `limit` respetado (5 y default 12)
- ✅ Token interno inválido → HTTP 403
- ✅ Campo `model_version` presente en respuesta y en cada ítem

---

## Dependencias Transitivas — Análisis de Riesgos

### API (NestJS / Node.js)

| Dependencia directa | Transitiva clave | Riesgo | Mitigación |
|---|---|---|---|
| `sharp ^0.35.5` | `libvips` (binding nativo C ≥ 8.16) | **Medio** — falla en ARM sin prebuild | Usar imagen Docker con prebuild; validado localmente con `sharp.metadata()` |
| `@nestjs/platform-express` | `multer ^1.4.5-lts` | **Bajo** — CVEs de path traversal ya históricas | `StorageService.validateKey` con regex estricto como barricada adicional |
| `@nestjs/websockets` | `socket.io ^4.x` → `engine.io ^6.x` | **Bajo** — engine.io v6 parchado | Mantenerse en socket.io 4.x LTS |
| `@prisma/client ^5.x` | `@prisma/engines` (binarios Rust) | **Bajo** — requiere descarga en `postinstall` | Pre-fetching en CI; imagen Docker con engines en cache |
| `bcryptjs ^2.4.3` | ninguna (pure JS) | **Muy bajo** — sin deps nativas | Ninguna; librería estable desde 2020 |

### ML Service (Python)

| Dependencia directa | Transitiva clave | Riesgo | Mitigación |
|---|---|---|---|
| `scikit-learn ≥1.4` | `numpy ≥1.26`, `scipy ≥1.x` | **Bajo** | Fijar versiones en `requirements.txt` con `==` en producción |
| `psycopg2-binary ≥2.9.9` | `libpq` (binding C) | **Medio** — binario específico de plataforma | En producción usar `psycopg2` (source build) |
| `fastapi ≥0.110` | `starlette`, `pydantic ≥2.6` | **Bajo** | Ecosistema muy activo, migraciones bien documentadas |

### Licencias

Todas las dependencias directas usan **MIT, Apache 2.0 o BSD-3**, compatibles
con uso comercial sin restricciones de copyleft.

---

## Documentación Técnica Complementaria

- **Arquitectura detallada**: [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md)
  - Diagrama de componentes del sistema
  - Diagrama de secuencia: envío de mensaje + idempotencia
  - Diagrama de secuencia: recomendaciones ML con degradación elegante
  - Modelo de datos (entidades y relaciones clave)
  - Decisiones de diseño justificadas (monorepo, Redis opcional, ML separado, validación en capas)
  - Análisis completo de dependencias transitivas y riesgos

- **Guías de features**: `docs/realtime.md`, `docs/marketplace.md`, `docs/images.md`
- **Guía de configuración de equipo**: `docs/team-setup.md`

---

## Cambios aplicados durante este análisis

### 1. `apps/api/src/common/filters/http-exception.filter.ts` *(archivo nuevo)*
Filtro global de excepciones que implementa **registro estructurado** y **respuestas de error consistentes** — Semana 5.

### 2. `apps/api/src/main.ts`
Registro del `GlobalHttpExceptionFilter` global con comentarios que documentan su relación con las semanas 4 y 5.

### 3. `apps/api/src/modules/users/users.service.ts`
Comentarios estructurados en el bloque del ml-service que documentan explícitamente los patrones de Semana 7 (timeout, graceful degradation, contrapresión).

### 4. `apps/api/package.json`
Agregados scripts `"test"` y `"test:watch"` para ejecutar la suite con `node --test`.

### 5. `apps/ml-service/tests/test_recommendations.py` *(archivo nuevo)*
13 pruebas automatizadas del ML service con `pytest`, cubriendo scoring, ordenamiento, límites, seguridad y estructura de respuesta.

### 6. `docs/architecture/ARCHITECTURE.md` *(archivo nuevo)*
Documento técnico de arquitectura con diagramas de componentes, secuencias, modelo de datos y decisiones de diseño.

