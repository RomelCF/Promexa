# Marketplace

El catalogo obtiene sus productos exclusivamente de PostgreSQL (modelo Product), vinculados a usuarios existentes mediante sellerId. No hay productos, fotografias, telefonos, tiendas ni busquedas de demostracion. Los productos antiguos de localStorage no se leen ni se migran. Las categorias y distritos son opciones del formulario, no anuncios precargados.

API autenticada con JWT:

- GET /api/v1/marketplace/products: catalogo ordenado del mas reciente al mas antiguo.
- POST /api/v1/marketplace/products: publicar un producto para el usuario autenticado.
- PATCH /api/v1/marketplace/products/:id/status: Disponible o Reservado; solo el propietario.
- DELETE /api/v1/marketplace/products/:id: eliminar; solo el propietario.

Nombre y verificacion del vendedor se obtienen de su perfil real. No se aceptan sellerId, store o isVerified desde el cliente. La foto opcional usa el servicio de subida de imagenes existente con el destino post. El precio debe ser positivo y tener como maximo dos decimales. No requiere cambios del esquema de Prisma.

Los favoritos se guardan localmente por cuenta; el catalogo y sus modificaciones siempre se persisten en el servidor. Un error del servidor muestra un error y no se sustituye por datos simulados. Si no hay productos se muestra el estado vacio.

## Consultas al vendedor

Coordinar con el vendedor abre /mensajes con userId y productId. El chat consulta los datos reales del producto y prepara un borrador editable con el nombre y la foto. No se envia nada hasta pulsar Enviar. El servidor comprueba que el producto pertenece al destinatario y guarda una copia del nombre y la URL de imagen en el mensaje; permanece en el historial aunque el producto cambie o se elimine. Es posible iniciar consultas comerciales sin ser amigos y responder en esa conversacion. No se autoriza iniciar conversaciones arbitrarias sin amistad, producto del destinatario o historial previo. Los contactos del chat incluyen amigos y participantes de conversaciones existentes.
