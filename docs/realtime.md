# Presencia, concurrencia y recuperacion de mensajes

## Estado real de conexion

La sesion autenticada mantiene una unica conexion Socket.IO por pestana durante toda la navegacion, no solo al abrir Mensajes. El servidor verifica el JWT y desconecta al expirar. Cerrar sesion desconecta esa pestana; otras pestanas del mismo navegador sincronizan el cierre mediante el evento storage. Si queda otra sesion activa en un dispositivo distinto, el usuario sigue en linea.

La presencia se obtiene de las salas user:{id}, no de un booleano persistido o de haber iniciado sesion alguna vez. Solo se marca desconectado cuando ya no quedan conexiones. Los contactos autorizados reciben cambios y el cliente solicita instantaneas cada 15 segundos y despues de reconectar. Las consultas estan limitadas a 100 IDs y a amigos, participantes de conversaciones, el propio usuario o el vendedor del producto consultado.

Si no hay conexion o no puede verificarse la presencia se muestra Estado no disponible. En una perdida abrupta de red, el heartbeat detecta la desconexion (intervalo 10 segundos y timeout 10 segundos); no es una deteccion instantanea. No se implementa un estado separado de inactividad por teclado o ultima visita.

## Envios simultaneos y reintentos

El cliente genera clientMessageId por envio. PostgreSQL impone unicidad sobre senderId y clientMessageId. Los reintentos usan el mismo ID y reciben el mensaje ya guardado, incluso si dos peticiones llegan al mismo tiempo y una encuentra el indice unico. Reutilizar el ID con otro texto, destinatario o producto se rechaza. Los mensajes antiguos con ID nulo siguen siendo validos.

Se confirma el envio despues de guardar el mensaje. El cliente reintenta hasta tres veces ante errores temporales o timeout y conserva el texto y el ID al agotarlos, permitiendo un reintento manual dentro de la misma sesion. Las entregas duplicadas de eventos se deduplican por el ID del mensaje. No se promete una unica entrega del evento WebSocket ni confirmacion de lectura.

El historial durable se recupera al entrar, al reconectar y cada 10 segundos para reparar eventos perdidos. Los mensajes se ordenan por createdAt e id. Si PostgreSQL falla no se confirma un guardado inexistente; si el transporte falla despues del guardado, el historial sigue disponible. No es una cola durable de borradores offline: recargar la pagina puede perder un borrador aun no enviado.

## Varias instancias y Redis

Una sola instancia funciona sin Redis (REDIS_WS_ENABLED=false, valor por defecto). Para desplegar varias instancias es obligatorio configurar REDIS_WS_ENABLED=true en todas y usar el mismo REDIS_URL o REDIS_HOST, REDIS_PORT y REDIS_PASSWORD. El adaptador oficial de Socket.IO distribuye eventos y consulta salas entre procesos. Los clientes utilizan transporte WebSocket.

Con Redis habilitado, la API falla al iniciar si no puede conectarlo; no arranca silenciosamente como una instancia aislada. Si se pierde Redis se indica presencia desconocida, se intenta reconectar y la persistencia PostgreSQL y las consultas HTTP del historial siguen siendo la fuente durable. Los eventos perdidos durante el fallo se recuperan al sincronizar el historial. Redis Pub/Sub no es almacenamiento de mensajes. Para cambiar nodos sin interrumpir clientes aun se requiere balanceador y despliegue gradual.

La prueba realtime.test.cjs utiliza sockets reales y verifica varias pestanas, conexiones rechazadas, presencia, fallo de disponibilidad, recuperacion y 20 envios concurrentes con la misma clave y 24 mensajes diferentes en ambos sentidos, sin perdida. No sustituye una prueba de carga ni valida por si sola un cluster Redis de produccion.

## Actualizacion de base de datos

El cambio aditivo aplicado esta en prisma/sql/20261022_message_idempotency.sql: agrega una columna opcional y un indice unico; no borra mensajes anteriores. Reiniciar el backend para cargar el cliente Prisma actualizado y el frontend para cargar el proveedor de conexion compartido.
