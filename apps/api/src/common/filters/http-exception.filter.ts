import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtro global de excepciones HTTP — Semana 5: Manejo de Excepciones
 *
 * Centraliza el manejo de todos los errores HTTP lanzados desde cualquier
 * controlador o servicio del proyecto. Implementa:
 *
 * - Registro estructurado (structured logging): cada error se registra con
 *   contexto enriquecido (método, ruta, statusCode, timestamp).
 * - Mensajes de excepción informativos: la respuesta siempre incluye
 *   un campo `error` legible y un `path` para facilitar el diagnóstico.
 * - Envoltura de excepciones (exception wrapping): las excepciones
 *   no-HTTP (errores inesperados) se envuelven como 500 Internal Server Error
 *   sin exponer detalles internos al cliente.
 * - Antipatrón evitado: NO se usa un catch vacío; siempre se registra
 *   y se responde con información útil.
 */
@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      // Extraer mensaje legible desde el cuerpo de la excepción
      message =
        typeof res === 'string'
          ? res
          : (res as any).message ?? exception.message;
    } else {
      // Excepción no esperada: registrar completa pero no exponer al cliente
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Error interno del servidor';
      // Registro estructurado del error real para diagnóstico en servidor
      this.logger.error({
        event: 'unhandled_exception',
        method: request.method,
        path: request.url,
        error: exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    }

    // Registro estructurado de excepciones HTTP (para niveles >= 500 se usa error, el resto warn)
    const logPayload = {
      event: 'http_exception',
      statusCode: status,
      method: request.method,
      path: request.url,
      message,
    };

    if (status >= 500) {
      this.logger.error(logPayload);
    } else if (status >= 400) {
      this.logger.warn(logPayload);
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: Array.isArray(message) ? message.join('; ') : message,
    });
  }
}
