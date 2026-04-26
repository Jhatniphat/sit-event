import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UpdateStaffScopeDto } from '../../event-staffs/dto/update-staff-scope.dto';
import { StaffPermissionType } from 'generated/prisma/wasm';

@Injectable()
export class ScopesService {
  private readonly logger = new Logger(ScopesService.name);

  constructor(private prisma: PrismaService) {}

  async getAllScopes() {
    return this.prisma.eventStaffScope.findMany({
      include: {
        staff: {
          include: {
            event: true,
            user: true,
          },
        },
        session: true,
      },
      orderBy: [
        { staff: { eventId: 'asc' } },
        { permission: 'asc' },
      ],
    });
  }

  async getStaffScopes(staffId: string) {
    const staff = await this.prisma.eventStaff.findUnique({
      where: { id: staffId },
      include: {
        scopes: {
          include: {
            session: true,
          },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    return staff.scopes;
  }

  async addScope(staffId: string, dto: UpdateStaffScopeDto) {
    const staff = await this.prisma.eventStaff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    if (dto.sessionId) {
      const session = await this.prisma.eventSession.findUnique({
        where: { id: dto.sessionId },
      });
      if (!session) {
        throw new NotFoundException('Session not found');
      }
      if (session.eventId !== staff.eventId) {
        throw new ConflictException('Session does not belong to the same event as the staff');
      }
    }

    /*
     * Note: Prisma constraint @@unique([staffId, sessionId, permission]) treats null as a unique value
     * But when querying with `where` in Prisma, handling nullable fields in composite unique keys can be tricky.
     * We'll check for existence manually first if needed, or rely on try-catch for unique constraint violation.
     * For now, let's use a simpler findFirst approach to mimic the constraint check before creating.
     */
    const existingScope = await this.prisma.eventStaffScope.findFirst({
      where: {
        staffId: staffId,
        sessionId: dto.sessionId || null,
        permission: dto.permission,
      },
    });

    if (existingScope) {
      throw new ConflictException('Staff already has this permission for this scope');
    }

    return this.prisma.eventStaffScope.create({
      data: {
        staffId,
        sessionId: dto.sessionId,
        permission: dto.permission,
      },
      include: {
        session: true,
      },
    });
  }

  async removeScope(scopeId: string) {
    const scope = await this.prisma.eventStaffScope.findUnique({
      where: { id: scopeId },
    });

    if (!scope) {
      throw new NotFoundException('Scope not found');
    }

    return this.prisma.eventStaffScope.delete({
      where: { id: scopeId },
    });
  }

  /*
   * Check if a staff member has ACCEPTED status.
   * Returns { isAccepted: boolean, staff?: EventStaff, message?: string }
   * Used by guards to provide clear error messages about staff status.
   */
  async checkStaffStatus(userId: string, eventId: string): Promise<{ isAccepted: boolean; staff?: any; message?: string }> {
    const staff = await this.prisma.eventStaff.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    if (!staff) {
      this.logger.warn(
        `No staff record found for userId: ${userId}, eventId: ${eventId}`,
      );
      return {
        isAccepted: false,
        message: 'Staff record not found',
      };
    }

    if (staff.status !== 'ACCEPTED') {
      this.logger.warn(
        `Staff userId: ${userId}, eventId: ${eventId} has status ${staff.status}, not ACCEPTED`,
      );
      return {
        isAccepted: false,
        staff,
        message: `Staff account is ${staff.status}. Must be ACCEPTED to access event resources.`,
      };
    }

    return {
      isAccepted: true,
      staff,
    };
  }

  /*
   * Helper method for guards checking.
   * Checks if a user has a specific permission for a given event, optionally scoped to a session.
   * If sessionId is provided, checking if the staff has permission for that SPECIFIC session OR event-wide permission.
   * Staff must have status 'ACCEPTED' to have any permissions.
   */
  async checkPermission(userId: string, eventId: string, permission: StaffPermissionType, sessionId?: string): Promise<boolean> {
    const staff = await this.prisma.eventStaff.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
      include: {
        scopes: true,
      },
    });

    if (!staff) {
      this.logger.warn(
        `No staff record found for userId: ${userId}, eventId: ${eventId}`,
      );
      return false;
    }

    // Note: Staff status is already validated in guard via checkStaffStatus()
    // No need to re-check here

    // Check if any scope matches the requirement
    const hasPermission = staff.scopes.some((scope) => {
      // Must match the permission type
      if (scope.permission !== permission) return false;

      // If scope.sessionId is null, it means event-wide permission -> ALWAYS VALID
      if (!scope.sessionId) return true;

      // If scope has a specific sessionId, it must match the requested sessionId
      if (sessionId && scope.sessionId === sessionId) return true;

      return false;
    });

    if (!hasPermission) {
      // Provide helpful hint if staff has session-specific scopes only
      const hasSessionScope = staff.scopes.some(
        (s) => s.permission === permission && s.sessionId,
      );
      const hint = !sessionId && hasSessionScope
        ? ` (Staff has session-specific permissions only - use /sessions/{sessionId}/participants endpoint instead)`
        : '';

      this.logger.debug(
        `Permission denied for userId: ${userId}, eventId: ${eventId}, permission: ${permission}${sessionId ? `, sessionId: ${sessionId}` : ''}${hint}`,
      );
    }

    return hasPermission;
  }
}

