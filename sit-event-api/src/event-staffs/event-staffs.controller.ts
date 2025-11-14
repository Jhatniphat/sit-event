import { Controller, Post, Param, Body, Get, Delete, Patch } from '@nestjs/common';
import { EventStaffsService } from './event-staffs.service';
import { 
  AdminOnly, 
  AllRoleAccess,
  EventOrganizerAccess,
  CurrentUser,
  type AuthenticatedUser,
  UserRole,
} from '../common';
import { ApplyToBeStaffDto } from './dto/apply-staff.dto';
import { AddStaffDto } from './dto/add-staff.dto';

@Controller('events')
export class EventStaffsController {
  constructor(private readonly eventStaffsService: EventStaffsService) {}

  @Post(':eventId/staffs/apply')
  @AllRoleAccess()
  async applyToBeStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
    @Body() dto: ApplyToBeStaffDto,
  ) {
    return this.eventStaffsService.createApplication(eventId, user, dto);
  }

  @Get(':eventId/staffs/me')
  @AllRoleAccess()
  async getMyStaffStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
  ) {
    return this.eventStaffsService.findMyApplication(eventId, user);
  }

  @Delete(':eventId/staffs/me')
  @AllRoleAccess()
  async deleteMyStaffStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
  ) {
    return this.eventStaffsService.removeMyApplication(eventId, user);
  }

  @Get(':eventId/staffs')
  @EventOrganizerAccess()
  async getAllStaffsForEvent(@Param('eventId') eventId: string) {
    return this.eventStaffsService.findAllByEventId(eventId);
  }

  @Post(':eventId/staffs/:userId/add')
  @EventOrganizerAccess()
  async addStaffToEvent(
    @Param('eventId') eventId: string,
    @Param('userId') userId: string,
    @Body() dto: AddStaffDto,
  ) {
    return this.eventStaffsService.createStaffEntry(eventId, userId, dto);
  }

  @Patch(':eventId/staffs/:staffId')
  @EventOrganizerAccess()
  async updateStaffRole(
    @Param('eventId') eventId: string,
    @Param('staffId') staffId: string,
    @Body() body: { status: "ACCEPTED" | "REFUSED" },
  ) {
    return this.eventStaffsService.updateStaffStatus(eventId, staffId, body.status);
  }

  @Delete(':eventId/staffs/:staffId')
  @EventOrganizerAccess()
  async removeStaffFromEvent(
    @Param('eventId') eventId: string,
    @Param('staffId') staffId: string,
  ) {
    return this.eventStaffsService.removeStaffEntry(eventId, staffId);
  }
}