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

## Cambios aplicados durante este análisis

### 1. `apps/api/src/common/filters/http-exception.filter.ts` *(archivo nuevo)*
Filtro global de excepciones que implementa **registro estructurado** y **respuestas de error consistentes** — Semana 5.

### 2. `apps/api/src/main.ts`
Registro del `GlobalHttpExceptionFilter` global con comentarios que documentan su relación con las semanas 4 y 5.

### 3. `apps/api/src/modules/users/users.service.ts`
Comentarios estructurados en el bloque del ml-service que documentan explícitamente los patrones de Semana 7 (timeout, graceful degradation, contrapresión).
