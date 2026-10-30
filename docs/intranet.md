# Intranet de Promexa

Acceso en `/admin` con una cuenta ADMIN. El dashboard y la API consultan PostgreSQL; no contienen cifras de demostracion. Personas y negocios no tienen permiso de acceso. El rol se verifica contra el usuario actual en la base de datos, no se confia en el rol enviado por el navegador o un JWT antiguo.

## Metricas disponibles

- Personas y negocios registrados, excluyendo cuentas administrativas.
- Negocios verificados y productos pertenecientes a negocios.
- Productos reservados actualmente, diferenciados de ventas.
- Usuarios unicos por dia e inicios de sesion, separados por tipo de perfil.
- Usuarios unicos del periodo: una cuenta que ingresa varios dias cuenta una sola vez en este indicador.
- Filtros de 7, 30 y 90 dias, detalle interactivo por dia y descarga CSV de accesos.
- Tabla y busqueda de negocios con su cantidad actual de productos publicados.

Los indicadores de cuentas y catalogo son totales actuales. El filtro temporal afecta los accesos. La zona horaria de todos los cortes diarios es America/Lima (UTC-5).

## Que significa un ingreso

Se registra un inicio de sesion correcto y el acceso automatico al crear una cuenta. Una recarga, consulta de perfil o restauracion de una sesion existente no genera otro inicio de sesion. Las cuentas ADMIN no se incluyen en la actividad de clientes.

La tabla `daily_user_accesses` guarda una fila por usuario y dia, su tipo de perfil, numero de ingresos y ultimo acceso. Los ingresos repetidos incrementan el contador mediante upsert. No se guardan direcciones IP, claves o tokens. Si se elimina una cuenta, sus registros de acceso tambien se eliminan por cascada. El tipo de perfil del dia refleja el ultimo ingreso registrado ese dia.

El historial empieza con los nuevos accesos posteriores a la instalacion de esta funcionalidad. No se pueden recuperar inicios de sesion antiguos porque no se almacenaban. El panel y el CSV indican los dias sin historial en lugar de inventar actividad. Se informa la fecha del primer acceso registrado; si todavia no hay accesos, se muestra ese estado.

## Ventas e ingresos monetarios

Por ahora se muestran como **no disponibles**, tanto globalmente como por negocio. Publicar o reservar un producto no demuestra una compra. La API devuelve `sales.available=false` y cantidades/importes `null`, no ventas ficticias o ceros que parezcan resultados confirmados.

Cuando se implemente la pasarela, se deberan persistir ordenes, articulos, cantidades, vendedor y precio/moneda de la operacion. La confirmacion debe venir de un webhook validado del proveedor y procesarse de forma idempotente. Las metricas de ventas se calcularan sobre operaciones confirmadas, definiendo tambien el tratamiento de devoluciones. Esta entrega no crea cobros, pedidos ni estados manuales de venta.

## Instalacion en otra computadora

Desde apps/api, con DATABASE_URL valido y despues de respaldar la base:

```powershell
npx.cmd prisma migrate deploy
npx.cmd prisma generate
npm.cmd run build
npm.cmd run start:dev
```

La migracion `20261030180000_add_daily_user_access` agrega una tabla, indices y su relacion con users; no elimina tablas o registros existentes. Ya se aplico en la base local de esta sesion. Antes se genero un dump privado en backups/before-intranet-*.dump, excluido de Git.

## API y comprobacion

`GET /api/v1/admin/metrics?days=7|30|90` requiere JWT valido y rol ADMIN. La web consulta `/api/admin/metrics`, que reenvia errores reales de autenticacion y disponibilidad. Tambien se protegieron los endpoints administrativos de consulta, actualizacion y eliminacion de usuarios.

Se retiraron usuarios ficticios del directorio y respuestas de exito simuladas de sus rutas de actualizacion/eliminacion. Los datos que no se almacenan, como DNI/RUC y riesgo, se presentan como no registrados o no evaluados.

Las pruebas de analytics cubren limites de fecha en Lima, accesos repetidos, exclusiones administrativas, usuarios unicos, ausencia de ventas confirmadas y permisos. Se verifico la agregacion en PostgreSQL con datos temporales dentro de una transaccion revertida. Tambien se verificaron respuestas HTTP 401 para anonimos, 403 para una cuenta normal incluso con una declaracion ADMIN en el token, y 200 para administradores, tanto en la API como en la web.
