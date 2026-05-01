import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    const userRole: Role | undefined = user?.role;
    const effective: Role[] = userRole ? [userRole] : [];
    if (userRole === Role.ADMIN_TEACHER) effective.push(Role.ADMIN, Role.TEACHER);
    if (!requiredRoles.some(r => effective.includes(r))) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
