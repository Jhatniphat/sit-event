import { CanActivate, ExecutionContext, Inject, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StaffPermissionType } from 'generated/prisma';
import { ScopesService } from '../../event-staffs/scopes/scopes.service';

export const PERMISSION_KEY = 'permission';
export const RequirePermission = (permission: StaffPermissionType) =>
  SetMetadata(PERMISSION_KEY, permission);

@Injectable()
export class StaffScopesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(ScopesService) private scopesService: ScopesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<StaffPermissionType>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) {
      return true; // No specific permission required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // Assumed we have eventId and sessionId in request params or body
    // This logic might need adjustment based on how clients send data
    const eventId = request.params.eventId || request.body.eventId;
    
    // Try to get sessionId if available (might be in params, body, or not present at all)
    const sessionId = request.params.sessionId || request.body.sessionId || null;

    if (!user || !eventId) {
      return false; // Cannot verify without user and event context
    }

    // Use our service logic to check full scope hierarchy
    return this.scopesService.checkPermission(
      user.id,
      eventId,
      requiredPermission,
      sessionId
    );
  }
}
