# Personas y negocios

La regla se decide a partir de `User.profileType` guardado en PostgreSQL. Cambiar el aspecto de la interfaz o el contenido del token no cambia los permisos.

| Accion | Persona | Negocio |
| --- | --- | --- |
| Enviar y aceptar amistad | Solo con otra persona | No permitido |
| Seguir perfiles | Solo negocios, sin aceptacion | No permitido |
| Iniciar chat con un negocio | Permitido, sin necesidad de seguirlo | Solo si el destinatario ya le envio un mensaje |
| Iniciar chat con una persona | Se mantienen las reglas de amistad, historial y consulta por producto | Solo si esa persona ya le envio un mensaje |
| Ver seguidores | En el perfil del negocio | Lista propia en /amigos y en su perfil |

Un seguimiento no concede al negocio permiso para enviar mensajes, aunque sea anterior a este cambio. Tampoco basta un mensaje historico enviado por el propio negocio: debe existir uno recibido del destinatario. La misma autorizacion se usa para mensajes y eventos de escritura del WebSocket. La presencia solo se comparte con contactos autorizados.

Los perfiles de negocio muestran seguidores; las personas muestran amigos. En /amigos las personas tambien ven los negocios que siguen. Las recomendaciones de amistad solo incluyen personas y no se generan para negocios. Las notificaciones de publicaciones y productos llegan a amigos personales y a quienes siguen al negocio, respetando la direccion del seguimiento.

## Persistencia compatible

No se requiere migracion ni restauracion de datos. Se reutiliza la tabla `friendships` que ya almacenaba ambos tipos de relacion:

- Una fila ACCEPTED entre dos personas representa una amistad reciproca.
- Una fila ACCEPTED con requester personal y addressee business representa un seguimiento dirigido. La API lo devuelve como FOLLOWING para la persona y FOLLOWER para el negocio.
- Las filas antiguas iniciadas por negocios no se consideran amistades ni seguimientos. No se eliminan automaticamente. Una persona puede seguir explicitamente al negocio y actualizar esa relacion.
- Las solicitudes pendientes que incluyan negocios no aparecen como solicitudes de amistad ni pueden aceptarse.

## API

- GET /users/friends: amigos personales.
- GET /users/followers: seguidores del negocio autenticado.
- GET /users/following: negocios seguidos por la persona autenticada.
- POST /users/:id/follow y DELETE /users/:id/follow: seguir y dejar de seguir un negocio.
- GET /users/:id/relationship: estado y permisos `canRequestFriendship`, `canFollow`, `canMessage`.
- POST /users/:id/friend-request se conserva por compatibilidad: entre personas solicita amistad; hacia un negocio sigue devolviendo FOLLOWING. Un negocio no puede utilizarlo.

Las pruebas `apps/api/test/business-relationships.test.cjs` cubren amistad personal, seguimiento, restricciones de negocios, historial previo, contactos y permisos de WebSocket. Las comprobaciones locales usan datos simulados y no modifican cuentas o mensajes reales.
