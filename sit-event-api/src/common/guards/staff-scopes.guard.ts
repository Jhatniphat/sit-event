import { CanActivate, ExecutionContext, Inject, Injectable, SetMetadata, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StaffPermissionType } from 'generated/prisma';
import { ScopesService } from '../../event-staffs/scopes/scopes.service';
import { UsersService } from '../../users/users.service';

export const PERMISSION_KEY = 'permission';
export const RequirePermission = (permission: StaffPermissionType) =>
  SetMetadata(PERMISSION_KEY, permission);

@Injectable()
export class StaffScopesGuard implements CanActivate {
  private readonly logger = new Logger(StaffScopesGuard.name);

  constructor(
    private reflector: Reflector,
    @Inject(ScopesService) private scopesService: ScopesService,
    @Inject(UsersService) private usersService: UsersService,
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
    
    // ✅ Improved: Validate user
    if (!user) {
      this.logger.error('No user information found in request');
      throw new BadRequestException('Authentication required');
    }

    if (!user.email) {
      this.logger.error('User object missing email');
      throw new BadRequestException('Invalid user identity');
    }

    // ✅ KEY FIX: Lookup database user by email to get correct userId
    // JWT has Keycloak sub, but database stores our own UUID
    const dbUser = await this.usersService.findByEmail(user.email);
    
    if (!dbUser) {
      this.logger.error(`User not found in database: ${user.email}`);
      throw new BadRequestException(`User with email '${user.email}' not found in database`);
    }

    const userId = dbUser.id;  // ✅ Use database UUID, not Keycloak sub
    
    // ✅ Improved: Better eventId extraction from multiple possible locations
    const eventId = 
      request.params.eventId || 
      request.params.id || 
      request.body?.eventId ||
      request.query?.eventId;
    
    // Try to get sessionId if available
    const sessionId = 
      request.params.sessionId || 
      request.body?.sessionId || 
      request.query?.sessionId ||
      null;

    if (!eventId) {
      this.logger.error(
        `Missing eventId for permission check. User: ${userId}, Required permission: ${requiredPermission}`,
      );
      throw new BadRequestException('Event context required for permission verification');
    }

    // Verify permission using the scopes service
    const hasPermission = await this.scopesService.checkPermission(
      userId,  // ✅ Now using database UUID
      eventId,
      requiredPermission,
      sessionId,
    );

    if (!hasPermission) {
      this.logger.warn(
        `Permission denied - userId: ${userId}, eventId: ${eventId}, permission: ${requiredPermission}${sessionId ? `, sessionId: ${sessionId}` : ''}`,
      );
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermission}${sessionId ? ` for session ${sessionId}` : ''}`,
      );
    }

    return true;
  }
}
