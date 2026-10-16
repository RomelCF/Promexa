# Backend - NestJS (TypeScript)

Servicio principal desacoplado construido con NestJS en TypeScript, organizado por arquitectura modular basada en Domain-Driven Design (DDD) y principios SOLID.

## Responsabilidades
- **API REST**: Controladores para autenticación, usuarios, publicaciones, marketplace y notificaciones.
- **Gateways WebSocket**: Manejo de eventos en tiempo real para chat y notificaciones usando Redis como adapter.
- **Persistencia Transaccional (PostgreSQL)**: Repositorios y entidades con TypeORM o Prisma.
- **Persistencia de Relaciones (Neo4j)**: Conexión mediante Cypher queries y driver oficial para modelar el grafo social (amistades, seguidores, interacciones, vistas).
- **Caché y Mensajería (Redis)**: Caché de consultas frecuentes, almacenamiento de sesiones y socket adapter.
- **Almacenamiento de Objetos (S3)**: Servicio para carga, firma de URLs y gestión de multimedia.
- **Integración con ML Service**: Cliente interno HTTP / gRPC para solicitar recomendaciones calculadas por el servicio en Python.

## Estructura de Módulos
```
src/
├── common/             # Decoradores, filtros de excepción, guards (JWT, Roles), interceptores
├── config/             # Configuración de variables de entorno y validación Joi/class-validator
├── database/
│   ├── postgres/       # Conexión, migraciones y configuración TypeORM/Prisma
│   └── neo4j/          # Driver de Neo4j, módulo y servicios Cypher
├── cache/              # Servicio y configuración de Redis (ioredis / cache-manager)
├── websockets/         # Gateway base y Redis IoAdapter para clustering
└── modules/
    ├── auth/           # Login, registro, hashing con bcrypt/argon2, estrategias JWT
    ├── users/          # Perfiles de usuario, seguimiento, actualización de datos
    ├── posts/          # Publicaciones del feed social, comentarios, likes
    ├── marketplace/    # Productos, categorías, transacciones/ofertas
    ├── chat/           # Salas, mensajes directos, persistencia y eventos WebSocket
    ├── notifications/  # Notificaciones en tiempo real e historial
    ├── storage/        # Adaptador AWS SDK v3 para Amazon S3
    └── recommendation-client/ # Cliente HTTP para consumir apps/ml-service
```
