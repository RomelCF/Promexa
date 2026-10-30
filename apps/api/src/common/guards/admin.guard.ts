import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.switchToHttp().getRequest().user?.role !== 'ADMIN') {
      throw new ForbiddenException('Acceso exclusivo para administradores');
    }
    return true;
  }
}
