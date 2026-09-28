import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import { RbacService } from '../../modules/rbac/rbac.service.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    if (user.role === 'super_admin') return true;

    const permissions = await this.rbacService.getEffectivePermissions(user.id);
    const hasAny = required.some((p) => permissions.includes(p));
    if (hasAny) return true;

    throw new ForbiddenException(
      `Missing permission(s): requires any of ${required.join(', ')}`,
    );
  }
}
