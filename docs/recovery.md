# Recuperacion local tras OneDrive (30/10/2026)

## Resultado de la revision

- Los 187 archivos versionados estaban presentes y sin diferencias respecto a HEAD. `git fetch origin` no trajo cambios nuevos; main tiene cuatro commits locales adicionales a origin/main.
- `git fsck --full` no encontro objetos corruptos o faltantes. Hay objetos sin referencias, incluido un antiguo guardado WIP con eliminaciones; no se aplico para evitar volver a borrar codigo.
- Las carpetas node_modules solo conservaban metadatos. Se reinstalaron con `npm.cmd ci` en apps/api y apps/web y se genero Prisma Client.
- La cache .next tenia referencias de OneDrive invalidas (EINVAL al leer app-build-manifest.json). Las caches anteriores se conservaron como `.next.onedrive-backup-20261030` y `.next-dev.onedrive-backup-20261030`; Next.js genera caches nuevas.
- Se corrigieron dos errores de la web: estado y filtrado de comercios verificados en marketplace, y apertura ausente de la condicion para desplegar comentarios en el feed.
- Se recuperaron seis imagenes desde backups/Promexa-datos-20261022.zip hacia apps/api/uploads. Sus SHA-256 coinciden con el manifiesto del respaldo. No se sobrescribieron archivos existentes.
- El CI ahora instala dependencias, compila ambas aplicaciones y ejecuta las pruebas de backend y ML; antes las etapas de Node solo imprimian un mensaje.

## Conexion de base de datos pendiente

Validacion local: backend compilado, 36 pruebas de Node aprobadas, frontend compilado en produccion con verificacion TypeScript y generacion de paginas, y sintaxis Python comprobada con py_compile. Las pruebas funcionales con PostgreSQL y las pruebas pytest de ML quedan pendientes por las condiciones del entorno indicadas abajo. Next.js mostro advertencias de cache de webpack, sin impedir completar la compilacion.

PostgreSQL 18 esta activo en 127.0.0.1:5432. La conexion del .env raiz falla por autenticacion y apps/api/.env apunta a 5433, donde no hay servidor. No se modificaron credenciales ni bases existentes.

Configurar DATABASE_URL con un usuario y clave validos en apps/api/.env y en .env raiz. Evitar copiar un .env completo encima del otro, porque pueden contener otras configuraciones locales. Git no recupera contrasenas ni registros PostgreSQL.

El respaldo backups/promexa.dump es legible por pg_restore y proviene de PostgreSQL 16. El paquete documenta tres usuarios, tres publicaciones, tres mensajes, un producto y una amistad al 22/10/2026. Para recuperar esos registros, restaurarlo en una base NUEVA con pg_restore --no-owner --no-privileges --exit-on-error. No restaurar encima de datos existentes. El respaldo es anterior a algunas migraciones del repositorio; revisar el esquema antes de arrancar la API. No ejecutar migrate reset ni eliminar volumenes.

Docker no se encontro en PATH. No es obligatorio si se usa PostgreSQL local y Redis desactivado para una sola instancia.

## Ejecutar en PowerShell

Usar npm.cmd y npx.cmd si la politica de PowerShell bloquea npm.ps1; no hace falta cambiar la politica del sistema.

```powershell
cd apps/api
npm.cmd ci
npx.cmd prisma generate
npm.cmd run build
npm.cmd test
npm.cmd run start:dev
```

En otra terminal, desde la raiz:

```powershell
cd apps/web
npm.cmd ci
npm.cmd run build
npm.cmd run dev
```

Web: http://localhost:3000. API: http://localhost:3001/api/v1.

Para ML se necesita Python con pip (el Python de MSYS2 encontrado no tiene pip ni pytest). Con una instalacion compatible:

```powershell
cd apps/ml-service
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt -r requirements-dev.txt
.venv/Scripts/python.exe -m pytest tests -q
```

## Que puede recuperar Git

Git comparte codigo y archivos registrados. No incluye node_modules, compilaciones, .env, registros PostgreSQL, uploads ni backups. `git pull` integra commits nuevos; no reinstala dependencias ni devuelve archivos que nunca se registraron. Los respaldos y las imagenes recuperadas siguen excluidos de Git y deben guardarse por separado.
