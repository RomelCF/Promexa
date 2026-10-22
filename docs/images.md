# Imagenes de perfil y publicaciones

## Uso local

No se requieren credenciales de AWS para desarrollo. La API usa almacenamiento local por defecto:

```env
STORAGE_DRIVER=local
PUBLIC_API_URL=http://localhost:3001/api/v1
```

Las imagenes se guardan en `apps/api/uploads/` al iniciar la API desde `apps/api`. Esa carpeta se excluye de Git y debe conservarse entre reinicios. No borrar la carpeta si se quieren mantener las fotos. En despliegues con varias instancias usar S3 y no el disco local.

Reiniciar la API (`npm run start:dev`) y el frontend (`npm run dev`) despues de instalar dependencias. Produccion requiere una nueva compilacion antes de `npm run start` en el frontend.

## Interfaz

- Editar perfil: seleccionar JPG, PNG o WebP de hasta 5 MB, previsualizar, guardar o quitar foto.
- Crear post: seleccionar una imagen de hasta 10 MB y publicar. No se utilizan imagenes de ejemplo.
- Seleccionar un archivo no lo sube: se sube al guardar el perfil o publicar.
- La subida y el guardado son pasos distintos. Si falla el guardado se informa el error; el usuario puede reintentar.

## Backend

`POST /api/v1/storage/images/avatar` y `POST /api/v1/storage/images/post` requieren JWT y un archivo multipart con el campo `file`.

La API limita el tamano, decodifica la imagen, comprueba su formato real y rechaza contenido invalido. Sharp aplica orientacion, elimina metadatos y convierte a WebP. Limites de salida: 512 x 512 para avatar y 1920 x 1920 para post, conservando proporcion y sin ampliar imagenes pequenas. Se rechazan animaciones y entradas de mas de 40 millones de pixeles.

Las claves son `avatar/{userId}/{uuid}.webp` o `post/{userId}/{uuid}.webp`. La respuesta contiene `key` y una URL estable de lectura a traves de la API. `User.avatar` y `Post.mediaUrl` guardan esta URL, no el archivo ni una URL firmada que pueda caducar.

`GET /api/v1/storage/images/{purpose}/{userId}/{file}` devuelve WebP con cache inmutable. La lectura es publica para mostrar fotos y posts. Los nombres son aleatorios; no subir contenido que deba ser privado. El bucket puede permanecer privado porque el backend accede con sus credenciales.

Al reemplazar o quitar una foto se cambia la referencia en el perfil; el archivo anterior no se elimina automaticamente. Queda pendiente una politica de limpieza para archivos sin referencias (incluidos archivos cuya subida termino pero cuyo guardado posterior fallo).

## S3 o MinIO

```env
STORAGE_DRIVER=s3
PUBLIC_API_URL=https://api.tu-dominio.com/api/v1
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=promexa-media
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
# Solo para MinIO u otro endpoint compatible; vacio para AWS:
AWS_S3_ENDPOINT=http://localhost:9000
```

Crear el bucket antes de usarlo. En AWS se pueden usar roles IAM en lugar de claves estaticas. El backend necesita `s3:PutObject` y `s3:GetObject` sobre el bucket configurado; no se requieren permisos publicos de escritura o lectura del bucket.

Para desarrollo con MinIO, iniciar un servidor MinIO persistente, crear el bucket desde su consola y configurar las credenciales de ese servidor en la API. El cliente habilita path-style cuando existe `AWS_S3_ENDPOINT`. El navegador solo habla con NestJS; no requiere CORS en el bucket.

`PUBLIC_API_URL` debe ser accesible desde el navegador. Si cambia el dominio, hay que actualizar las referencias de imagen ya guardadas o mantener una redireccion del dominio anterior.

## Recorte de avatar

Al elegir una foto de perfil se abre el encuadre circular: arrastrar, ajustar zoom o utilizar los controles de posicion. Usar esta foto genera una imagen cuadrada de 512 x 512 con el encuadre elegido; la interfaz la muestra en circulo. Cancelar recorte conserva la foto anterior y no sube archivos. Guardar cambios sube la imagen recortada. Las URLs HTTP/HTTPS locales tambien se aceptan en desarrollo.
