# Infraestructura y Despliegue en AWS

Contenedores Docker orquestados sobre AWS, con CI/CD automatizado en GitHub Actions.

## Componentes Cloud
- **Cómputo / Orquestación**:
  - AWS ECS (Elastic Container Service) con Fargate o EC2 para desplegar los contenedores de:
    - Frontend (`apps/web`)
    - Backend (`apps/api`)
    - ML Service (`apps/ml-service`)
  - Application Load Balancer (ALB) con soporte para HTTP/HTTPS y WebSockets (WSS).
- **Bases de Datos & Caché**:
  - Amazon RDS (PostgreSQL) para datos transaccionales con Multi-AZ y backups automáticos.
  - Neo4j AuraDB o contenedor Neo4j en EC2 con EBS persistente.
  - Amazon ElastiCache (Redis) o cluster Redis para sesiones, colas y WebSockets.
- **Almacenamiento de Objetos**:
  - Amazon S3 con CloudFront (CDN) para entrega rápida de multimedia (imágenes, videos, documentos).
- **Seguridad**:
  - AWS Secrets Manager / Parameter Store para variables de entorno sensibles.
  - IAM Roles con permisos de menor privilegio para cada servicio.
