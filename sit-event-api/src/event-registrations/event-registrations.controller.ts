import { Controller, Post, Param, Delete, HttpCode, Patch, Get, Query } from '@nestjs/common';
import { EventRegistrationsService } from './event-registrations.service';
import { RegistrationStatus } from '../../generated/prisma';
import { 
  Roles, 
  AdminOnly, 
  EventOrganizerAccess, 
  AllRoleAccess,
  CurrentUser,
  type AuthenticatedUser,
  UserRole,
} from '../common';

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
  // Get Pending Registrations (Admin)
  // =============================================
  @Get(':eventId/registrations/pending')
  @AdminOnly()
  async getPendingRegistrations(@Param('eventId') eventId: string) {
    return this.eventRegistrationsService.getPendingRegistrations(eventId);
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
}