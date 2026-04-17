import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  REQUIRED_ANY_PERMISSIONS_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from '../decorators/permissions.decorator';
import type { AuthUser } from '../interfaces/auth-user.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredAnyPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_ANY_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const hasRequiredAll = !!requiredPermissions && requiredPermissions.length > 0;
    const hasRequiredAny =
      !!requiredAnyPermissions && requiredAnyPermissions.length > 0;

    if (!hasRequiredAll && !hasRequiredAny) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();

    if (!request.user) {
      throw new UnauthorizedException('Authentication is required');
    }

    if (request.user.roleCodes?.includes('super_admin')) {
      return true;
    }

    const grantedPermissions = new Set(request.user.permissionCodes);
    const missingPermissions = hasRequiredAll
      ? requiredPermissions.filter(
          (permission) => !grantedPermissions.has(permission),
        )
      : [];

    if (missingPermissions.length > 0) {
      throw new ForbiddenException({
        message: 'Insufficient permissions',
        missingPermissions,
      });
    }

    if (
      hasRequiredAny &&
      !requiredAnyPermissions.some((permission) =>
        grantedPermissions.has(permission),
      )
    ) {
      throw new ForbiddenException({
        message: 'Insufficient permissions',
        missingAnyPermissions: requiredAnyPermissions,
      });
    }

    return true;
  }
}
