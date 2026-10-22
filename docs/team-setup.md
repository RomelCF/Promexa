# Incorporacion de otro desarrollador

## Que comparte Git

El repositorio contiene el codigo, package.json y lockfiles, esquema de Prisma, SQL de actualizaciones y documentacion. Git no comparte .env, node_modules, el volumen PostgreSQL de Docker ni apps/api/uploads. Los respaldos se guardan en backups/, que esta excluido de Git.

Prisma es el ORM entre NestJS y PostgreSQL. schema.prisma define usuarios, amistades, posts, productos y mensajes; prisma generate genera el cliente tipado para consultas y escrituras. Prisma no es una segunda base de datos. prisma db push crea o sincroniza la estructura, no copia registros de otra computadora. Actualmente no hay un historial completo de migraciones Prisma: en desarrollo se usa db push. El SQL en prisma/sql agrega la clave de idempotencia. seed.ts no genera usuarios ni productos ficticios.

Los datos PostgreSQL estan en el volumen nombrado promexa_postgres_data, montado dentro del contenedor en /var/lib/postgresql/data. La imagen postgres:16-alpine contiene el motor, no los registros. Una computadora nueva obtiene un volumen vacio aunque use el mismo nombre.

## Configuracion inicial (PowerShell, raiz del repositorio)

Usar Node.js 24 LTS y Docker Desktop. Ejecutar git pull sobre la rama compartida.

```powershell
Copy-Item .env.example .env
```

Editar .env antes de continuar. POSTGRES_PORT y el puerto de DATABASE_URL deben coincidir. En la computadora original el contenedor promexa_postgres expone 5433 -> 5432; el .env de la API apunta a 127.0.0.1:5433, pero el .env raiz apuntaba a 5432 al realizar esta revision. Para reproducir esa conexion, usar POSTGRES_PORT=5433 y cambiar el puerto de DATABASE_URL a 5433. Asegurar que usuario, clave y nombre de base tambien coincidan con el contenedor. No sobreescribir el .env de la computadora original con ejemplos sin revisar sus credenciales.

Despues de ajustar .env:

```powershell
Copy-Item .env apps/api/.env

docker compose up -d postgres redis neo4j

Set-Location apps/api
npm ci
npx prisma generate
```

NestJS carga el .env raiz y Prisma CLI utiliza el de apps/api. Mantener ambos DATABASE_URL sincronizados. No publicar ninguno en Git. Las variables de la web deben estar en apps/web/.env.local si se cambian los valores por defecto; Next.js no carga automaticamente el .env raiz del repositorio.

Elegir una de las dos opciones siguientes.

### Opcion A: base de datos vacia

Desde apps/api:

```powershell
npx prisma db push
npm run start:dev
```

No aparecen usuarios ni publicaciones del otro desarrollador. Registrar cuentas nuevas y crear datos desde la aplicacion.

### Opcion B: copia de los datos existentes

El desarrollador original exporta los datos como se indica abajo. El receptor restaura el respaldo en una base VACIA antes de ejecutar db push. El dump completo ya incluye la estructura de tablas; si se crean previamente con db push, la restauracion puede encontrar tablas duplicadas. No usar opciones --clean, reinicios de base ni docker compose down -v para intentar corregir conflictos sobre datos que se quieran conservar.

Desde la raiz del repositorio, con el archivo recibido en backups/promexa.dump:

```powershell
docker cp .\backups\promexa.dump promexa_postgres:/tmp/promexa.dump
docker exec promexa_postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges --exit-on-error /tmp/promexa.dump'
```

Si el receptor ya tiene datos que quiere mantener, usar otra base/volumen para la copia. No restaurar encima de sus registros. Restaurar no cambia el usuario y la clave de conexion configurados al crear el contenedor.

Desde apps/api, despues de restaurar:

```powershell
npx prisma generate
npm run start:dev
```

### Frontend (otra terminal)

Desde apps/web:

```powershell
npm ci
npm run dev
```

Abrir la URL que indique la terminal. API por defecto: http://localhost:3001/api/v1. Web por defecto: http://localhost:3000. Para produccion ejecutar npm run build antes de npm run start; .next no se comparte por Git.

Para puertos diferentes, crear apps/web/.env.local:

```env
API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

## Exportar los datos originales

Desde la raiz, con Docker y PostgreSQL activos:

```powershell
New-Item -ItemType Directory -Force backups

docker exec promexa_postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-privileges -f /tmp/promexa.dump'
docker cp promexa_postgres:/tmp/promexa.dump .\backups\promexa.dump
```

pg_dump incluye usuarios, hashes de claves, amistades, posts, productos, mensajes e indices. Se usa un archivo dentro del contenedor y docker cp para evitar redirigir datos binarios mediante PowerShell. Compartir promexa.dump de forma privada con el companero, fuera de Git. No incluye credenciales de conexion del archivo .env. Las contrasenas de usuarios siguen siendo hashes; no permiten conocer las claves originales. Compartir las credenciales de cuentas de prueba por separado o crear cuentas nuevas.

No se ha exportado ningun respaldo automaticamente al escribir esta guia.

## Compartir las imagenes

Con STORAGE_DRIVER=local, PostgreSQL guarda las URLs; los archivos estan en apps/api/uploads. Compartir tambien esa carpeta, conservando subcarpetas y nombres. Si existe:

```powershell
Compress-Archive -LiteralPath .\apps\api\uploads -DestinationPath .\backups\uploads.zip
```

El receptor descomprime desde la raiz:

```powershell
Expand-Archive -LiteralPath .\backups\uploads.zip -DestinationPath .\apps\api
```

No sobrescribir archivos existentes sin revisar conflictos. Las URLs originales localhost:3001 funcionan en la computadora del receptor si la API se ejecuta en el mismo puerto. Para otro dominio/puerto hay que adaptar las referencias guardadas o mantener el mismo endpoint; cambiar PUBLIC_API_URL solo afecta nuevas subidas.

Con S3 o MinIO se necesitan tambien los objetos y acceso al bucket correspondiente; un dump no incluye objetos. Nunca incluir credenciales AWS o archivos .env en el commit.

## Funcionalidades incorporadas

- Persistencia PostgreSQL con Prisma para cuentas, amistades, posts, productos y mensajes.
- Autenticacion JWT con verificacion de firma, expiracion y usuario real.
- Registro, busqueda de usuarios y solicitudes de amistad.
- Pagina /perfil: datos personales, carga y recorte circular de foto, cambio de clave con clave actual (sin correo en este MVP).
- Subida de JPG, PNG y WebP con validacion, procesamiento y almacenamiento local o S3/MinIO.
- Feed con publicaciones reales y fotos completas.
- Marketplace conectado a PostgreSQL, productos de usuarios reales y acciones restringidas al vendedor.
- Consulta comercial con texto preparado, producto y foto adjuntos, sin envio automatico.
- Historial de chat durable, presencia real, varias pestanas, reconexion y envios idempotentes.
- Redis para coordinar varias instancias cuando REDIS_WS_ENABLED=true; para una instancia puede quedar false.

Los likes, comentarios y favoritos de algunas pantallas todavia tienen comportamiento local; no todos son persistencia completa por usuario. El cambio de clave aun no verifica correo ni revoca todas las sesiones. Revisar docs/profile-security.md, docs/images.md, docs/marketplace.md y docs/realtime.md para limites y pendientes.

## Preparar commit y push

Revisar git diff y git status. No anadir respaldos, imagenes subidas, .env ni dependencias. tsconfig.tsbuildinfo es generado y estaba versionado; quitarlo solo del indice con git rm --cached conserva el archivo local.

```powershell
git add .
git rm --cached --ignore-unmatch apps/web/tsconfig.tsbuildinfo
git diff --cached --stat
git status --short
git commit -m "feat: integrar Prisma, perfiles, marketplace y chat persistente"
git push origin main
```

La rama actual al escribir la guia es main. Si se trabaja en otra rama, sustituir main por esa rama y coordinar el pull con el companero. Si el remoto avanzo, no usar force push: integrar primero los cambios del equipo.
