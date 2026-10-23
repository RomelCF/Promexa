import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisIoAdapter } from './websockets/redis-io.adapter';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  if (config.get('REDIS_WS_ENABLED') === 'true') {
    const adapter = new RedisIoAdapter(app);
    await adapter.connect(config);
    app.useWebSocketAdapter(adapter);
  }
  app.enableShutdownHooks();

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // CORS for frontend
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.CORS_ORIGIN || '',
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global exception filter — Semana 5: registro estructurado y manejo centralizado de errores
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Global validation pipe — Semana 4: programación defensiva, validación de entradas
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Promexa Backend API is running on: http://localhost:${port}/api/v1`);
}

bootstrap();
