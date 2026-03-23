import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UpdateStaffScopeDto } from '../../event-staffs/dto/update-staff-scope.dto';
import { StaffPermissionType } from 'generated/prisma/wasm';

@Injectable()
export class ScopesService {
  constructor(private prisma: PrismaService) {}

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
        permission: dto.permission as unknown as any, // Cast to any if type mismatch persists, but standard enum should work
      },
    });

    if (existingScope) {
      throw new ConflictException('Staff already has this permission for this scope');
    }

    return this.prisma.eventStaffScope.create({
      data: {
        staffId,
        sessionId: dto.sessionId,
        permission: dto.permission as unknown as any,
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
   * Helper method for guards checking.
   * Checks if a user has a specific permission for a given event, optionally scoped to a session.
   * If sessionId is provided, checking if the staff has permission for that SPECIFIC session OR event-wide permission.
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

    if (!staff) return false;

    // Check if any scope matches the requirement
    return staff.scopes.some((scope) => {
      // Must match the permission type
      if (scope.permission !== permission) return false;

      // If scope.sessionId is null, it means event-wide permission -> ALWAYS VALID
      if (!scope.sessionId) return true;

      // If scope has a specific sessionId, it must match the requested sessionId
      if (sessionId && scope.sessionId === sessionId) return true;

      return false;
    });
  }
}

