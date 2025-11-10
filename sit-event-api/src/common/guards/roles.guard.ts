import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AnyRole, hasAnyRole, hasHigherOrEqualRole } from '../enums/roles.enum';

export const ROLES_KEY = 'roles';
export const REQUIRE_ALL_ROLES_KEY = 'require-all-roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AnyRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required
    }

    const requireAllRoles = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_ALL_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    ) ?? false;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false; // No user authenticated
    }

    // Extract roles from user (support both Keycloak and custom user objects)
    const clientId = process.env.KC_CLIENT_ID || 'default-client';
    const userRoles: string[] = [
      ...(user.realm_access?.roles || []),
      ...(user.resource_access?.[clientId]?.roles || []),
      ...(user.roles || []),
      user.role, // Single role field
    ].filter(Boolean);

    if (requireAllRoles) {
      // User must have ALL required roles (or higher)
      return requiredRoles.every(role => 
        hasHigherOrEqualRole(userRoles, role)
      );
    } else {
      // User must have ANY of the required roles (or higher)
      return requiredRoles.some(role => 
        hasHigherOrEqualRole(userRoles, role)
      );
    }
  }
}