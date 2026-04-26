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
    
    if (!user) {
      this.logger.error('No user information found in request');
      throw new BadRequestException('Authentication required');
    }

    if (!user.email) {
      this.logger.error('User object missing email');
      throw new BadRequestException('Invalid user identity');
    }

    // KEY FIX: Lookup database user by email to get correct userId
    // JWT has Keycloak sub, but database stores our own UUID
    const dbUser = await this.usersService.findByEmail(user.email);
    
    if (!dbUser) {
      this.logger.error(`User not found in database: ${user.email}`);
      throw new BadRequestException(`User with email '${user.email}' not found in database`);
    }

    const userId = dbUser.id;  // ✅ Use database UUID, not Keycloak sub
    
    // STEP 0: System Admins bypass all specific staff checks
    if (dbUser.userRole === 'ADMIN') {
      this.logger.debug(`User ${userId} is System Admin, bypassing staff permission check`);
      return true;
    }
    
    //  Better eventId extraction from multiple possible locations
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

    // STEP 1: Check if staff has ACCEPTED status first
    const statusCheck = await this.scopesService.checkStaffStatus(userId, eventId);
    
    if (!statusCheck.isAccepted) {
      this.logger.warn(
        `Staff status check failed - userId: ${userId}, eventId: ${eventId}, status: ${statusCheck.staff?.status || 'not found'}`,
      );
      throw new ForbiddenException(
        statusCheck.message || 'Staff account must be ACCEPTED to access resources',
      );
    }

    // STEP 2: Verify permission using the scopes service
    const hasPermission = await this.scopesService.checkPermission(
      userId,  // Using database UUID
      eventId,
      requiredPermission,
      sessionId,
    );

    if (!hasPermission) {
      this.logger.warn(
        `Permission denied - userId: ${userId}, eventId: ${eventId}, permission: ${requiredPermission}${sessionId ? `, sessionId: ${sessionId}` : ''}`,
      );
      
      //Provide helpful error message when accessing event-level endpoint without permission
      const sessionHint = !sessionId ? ' (Try using /sessions/{sessionId}/participants endpoint instead)' : '';
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermission}${sessionHint}`,
      );
    }

    return true;
  }
}
