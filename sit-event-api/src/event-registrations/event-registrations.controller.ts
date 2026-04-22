import { Controller, Post, Param, Delete, HttpCode, Patch, Get, Query, Res, Body, UseGuards } from '@nestjs/common';
import { EventRegistrationsService } from './event-registrations.service';
import type { Response } from 'express';
import { RegistrationStatus } from '../../generated/prisma';
import { StaffPermissionType } from '../../generated/prisma';
import { 
  Roles, 
  AdminOnly, 
  EventOrganizerAccess, 
  AllRoleAccess,
  CurrentUser,
  type AuthenticatedUser,
  UserRole,
} from '../common';
import { StaffScopesGuard, RequirePermission } from '../common/guards/staff-scopes.guard';
import { StaffCheckInDto } from './dto/staff-check-in.dto';

@Controller('events')
export class EventRegistrationsController {
  constructor(private readonly eventRegistrationsService: EventRegistrationsService) {}

  @Post(':eventId/register')
  @AllRoleAccess()
  async registerUserToEvent(@Param('eventId') eventId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eventRegistrationsService.registerUserToEvent(eventId, user);
  }

  @Delete(':eventId/unregister')
  @HttpCode(204)
  @AllRoleAccess()
  async unregisterUserFromEvent(@Param('eventId') eventId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eventRegistrationsService.unregisterUserFromEvent(eventId, user);
  }

  @Get('registrations/me')
  @AllRoleAccess()
  async findMyRegistration(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventRegistrationsService.findMyRegistration(user);
  }

  @Delete('registrations/:registrationId/cancel')
  @HttpCode(204)
  @AdminOnly()
  async cancelRegistrationById(@Param('registrationId') registrationId: string) {
    return this.eventRegistrationsService.cancelRegistrationById(registrationId);
  }

  @Patch(':eventId/registrations/:registrationId')
  @AdminOnly()
  async changeAttendedStatusByRegistrationId(
    @Param('eventId') eventId: string,
    @Param('registrationId') registrationId: string,
  ) {
    return this.eventRegistrationsService.changeAttendedStatusByRegistrationId(
      eventId,
      registrationId,
      true,
    );
  }

  @Patch(':eventId/users/:userId')
  @AllRoleAccess()
  async changeAttendedStatusByUserId(
    @Param('eventId') eventId: string,
    @Param('userId') userId: string,
  ) {
    return this.eventRegistrationsService.changeAttendedStatusByUserId(
      eventId,
      userId,
      true,
    );
  }

  @Get(':eventId/open-qr/:userId')
  @AllRoleAccess() 
  async checkUserQrStatus(
    @Param('eventId') eventId: string,
    @Param('userId') userId: string,
  ) {
    return this.eventRegistrationsService.checkUserQrStatus(eventId, userId);
  }

  // =============================================
  // Get Registration Columns (Admin)
  // =============================================
  @Get(':eventId/registrations/columns')
  @AdminOnly()
  async getRegistrationColumns(@Param('eventId') eventId: string) {
    return this.eventRegistrationsService.getRegistrationColumns(eventId);
  }

  // =============================================
  // Get Pending Registrations (Admin)
  // =============================================
  @Get(':eventId/registrations/pending')
  @AdminOnly()
  async getPendingRegistrations(
    @Param('eventId') eventId: string,
    @Query('fields') fields?: string | string[],
    @Query('questionIds') questionIds?: string | string[],
  ) {
    // Normalize query params to string[]
    const parseArray = (input: string | string[] | undefined): string[] => {
      if (!input) return [];
      if (Array.isArray(input)) return input;
      return input.split(',').map((s) => s.trim());
    };

    const fieldsArray = parseArray(fields);
    const questionsArray = parseArray(questionIds);

    return this.eventRegistrationsService.getPendingRegistrations(
        eventId, 
        fieldsArray, 
        questionsArray
    );
  }

  // =============================================
  // Get Registrations by Status (Admin)
  // =============================================
  @Get(':eventId/registrations')
  @AdminOnly()
  async getRegistrationsByStatus(
    @Param('eventId') eventId: string,
    @Query('status') status?: RegistrationStatus,
  ) {
    return this.eventRegistrationsService.getRegistrationsByStatus(eventId, status);
  }

  // =============================================
  // Get Registration Capacity Limits (Admin)
  // =============================================
  @Get(':eventId/registrations/capacity')
  @AdminOnly()
  async getRegistrationCapacity(@Param('eventId') eventId: string) {
    return this.eventRegistrationsService.getRegistrationCapacity(eventId);
  }

  // =============================================
  // Approve Registration (Admin)
  // =============================================
  @Patch(':eventId/registrations/:registrationId/approve')
  @AdminOnly()
  async approveRegistration(
    @Param('eventId') eventId: string,
    @Param('registrationId') registrationId: string,
  ) {
    return this.eventRegistrationsService.approveRegistration(eventId, registrationId);
  }

  // =============================================
  // Reject Registration (Admin)
  // =============================================
  @Patch(':eventId/registrations/:registrationId/reject')
  @AdminOnly()
  async rejectRegistration(
    @Param('eventId') eventId: string,
    @Param('registrationId') registrationId: string,
  ) {
    return this.eventRegistrationsService.rejectRegistration(eventId, registrationId);
  }

  // Check-in Event หลัก (Update)
  @Patch(':eventId/check-in/:userId')
  @AllRoleAccess() 
  async checkInUser(
    @Param('eventId') eventId: string,
    @Param('userId') userId: string,
  ) {
    return this.eventRegistrationsService.checkInUser(eventId, userId);
  }

  // [NEW] Check-in Sub-session
  @Patch(':eventId/check-in/:userId/:sessionId')
  @AllRoleAccess()
  async checkInUserSession(
    @Param('eventId') eventId: string,
    @Param('userId') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.eventRegistrationsService.checkInUserSession(eventId, userId, sessionId);
  }

  // =============================================
  // Staff Check-in with EventStaffScope Authorization
  // =============================================

  @Post(':eventId/staff/check-in')
  @UseGuards(StaffScopesGuard)
  @RequirePermission(StaffPermissionType.CHECK_IN)
  async staffCheckIn(
    @Param('eventId') eventId: string,
    @Body() dto: StaffCheckInDto,
  ) {
    // Note: StaffScopesGuard ensures:
    // 1. User is authenticated and exists in DB
    // 2. Has CHECK_IN permission in EventStaffScope
    // 3. Scope matches (event-wide or session-specific)
    // 
    // Guard validates authorization before this handler is called.
    
    return this.eventRegistrationsService.staffCheckIn(
      eventId,
      dto.userId,
      dto.sessionId ?? null,
    );
  }

  // =============================================
  // Export Registrations (Admin)
  // =============================================
  @Get(':eventId/registrations/export')
  @AdminOnly()
  async exportRegistrations(
    @Param('eventId') eventId: string,
    @Res() res: Response,
  ) {
    return this.eventRegistrationsService.exportRegistrations(eventId, res);
  }
}
