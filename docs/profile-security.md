# Perfil y cambio de clave

La ruta `/perfil` permite editar solo la cuenta autenticada: nombre, correo, foto y cambio de clave. Los accesos del feed y del menu superior dirigen a esta pagina. El recorte se presenta dentro de la pagina, sin modal.

## MVP actual

`PATCH /api/v1/users/me/password` requiere un JWT valido y `currentPassword`, `newPassword`, `confirmPassword`. La API comprueba la clave actual con bcrypt, valida la confirmacion y guarda un nuevo hash bcrypt. El ID procede exclusivamente del JWT. No se envian correos ni se simula una verificacion de Gmail. No es un flujo de recuperacion de clave olvidada.

Los tokens JWT existentes no se revocan automaticamente al cambiar la clave en este MVP. Implementar versionado o revocacion de sesiones antes del flujo de seguridad completo.

## Evolucion requerida: verificacion por correo

Para una version posterior, requerir una prueba de acceso al correo registrado antes de autorizar el cambio: codigo o enlace de un solo uso, caducidad breve, limites de intentos y reenvios, y almacenamiento del hash del token. El servidor debe asociar esa prueba a la cuenta y al cambio de clave solicitado, consumirla de manera atomica y verificarla tambien en el endpoint que cambia la clave. No basta una confirmacion del frontend.

El mensaje se enviara al correo registrado (incluidas cuentas Gmail); Gmail es el proveedor del buzon, no una prueba de identidad por si mismo. El cambio de direccion de correo tambien necesitara verificacion antes de emplearse como canal de recuperacion. Tras cambiar la clave, revocar las sesiones anteriores y enviar una notificacion de seguridad. No activar envios ni integrar Gmail o SMTP en el MVP actual.
