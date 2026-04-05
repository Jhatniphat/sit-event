import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, NotFoundException, All, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { EventSessionsService } from './event-sessions.service';
import { CreateEventSessionDto } from './dto/create-event-session.dto';
import { UpdateEventSessionDto } from './dto/update-event-session.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AllRoleAccess, CurrentUser, type AuthenticatedUser, AdminOnly, EventOrganizerAccess } from '../common';
import { UsersService } from '../users/users.service';
import { Public } from 'nest-keycloak-connect';
import { RequirePermission } from '../common/guards/staff-scopes.guard';
import { StaffPermissionType } from 'generated/prisma';
import { StaffScopesGuard } from '../common/guards/staff-scopes.guard';


@ApiTags('Event Sessions')
@Controller('events/:eventId/sessions')
export class EventSessionsController {
  constructor(
    private readonly eventSessionsService: EventSessionsService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @EventOrganizerAccess()
  @ApiOperation({ summary: 'Create a new session for an event' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ 
    status: 201, 
    description: 'The session has been successfully created.',
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Event not found.',
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid input data.',
  })
  create(
    @Param('eventId') eventId: string,
    @Body() createEventSessionDto: CreateEventSessionDto,
  ) {
    return this.eventSessionsService.create(eventId, createEventSessionDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all sessions for a specific event' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Return all sessions for the event.',
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Event not found.',
  })
  findAllByEvent(@Param('eventId') eventId: string) {
    return this.eventSessionsService.findAllByEvent(eventId);
  }

  @Get('me/registered')
  @AllRoleAccess()
  @ApiOperation({ summary: 'Get my registered sessions in an event' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Return all sessions you registered for.',
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Event not found.',
  })
  async getMyRegisteredSessions(
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dbUser = await this.usersService.findByEmail(user.email);
    if (!dbUser) {
      throw new NotFoundException(
        `User with email '${user.email}' not found in database.`,
      );
    }
    return this.eventSessionsService.getUserRegisteredSessions(eventId, dbUser.id);
  }

  @Get('users/:userId/registered')
  @EventOrganizerAccess()
  @ApiOperation({ summary: 'Get all sessions that a user has registered for in an event (for staff/admin)' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Return all sessions the user registered for.',
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Event or User not found.',
  })
  getUserRegisteredSessions(
    @Param('eventId') eventId: string,
    @Param('userId') userId: string,
  ) {
    return this.eventSessionsService.getUserRegisteredSessions(eventId, userId);
  }

  @Get(':sessionId')
  @Public()
  @ApiOperation({ summary: 'Get a specific session by ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Return the session details.',
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Session or Event not found.',
  })
  findOne(
    @Param('eventId') eventId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.eventSessionsService.findOne(eventId, sessionId);
  }

  @Get(':sessionId/participants')
  @UseGuards(StaffScopesGuard)
  @RequirePermission(StaffPermissionType.VIEW_PARTICIPANTS)
  @ApiOperation({ summary: 'Get participants registered for a specific session (requires VIEW_PARTICIPANTS permission)' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiQuery({ name: 'limit', description: 'Number of records to return', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', description: 'Number of records to skip', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'search', description: 'Search by firstName, lastName, or email', required: false, type: String })
  @ApiResponse({ 
    status: 200, 
    description: 'Return paginated list of session participants.',
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Session or Event not found.',
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Insufficient permissions.',
  })
  getSessionParticipants(
    @Param('eventId') eventId: string,
    @Param('sessionId') sessionId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
  ) {
    return this.eventSessionsService.getSessionParticipants(
      eventId,
      sessionId,
      page ?? 1,
      limit ?? 20,
      search,
    );
  }

  @Post(':sessionId/register')
  @AllRoleAccess()
  @HttpCode(HttpStatus.CREATED)
  @AllRoleAccess()
  @ApiOperation({ summary: 'Register for a specific session' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ 
    status: 201, 
    description: 'Successfully registered for the session.',
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Session or Event not found.',
  })
  @ApiResponse({ 
    status: 400, 
    description: 'No available seats or must register for event first.',
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Already registered for this session.',
  })
  registerToSession(
    @Param('eventId') eventId: string,
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventSessionsService.registerToSession(eventId, sessionId, user);
  }

  @Patch(':sessionId')
  @EventOrganizerAccess()
  @ApiOperation({ summary: 'Update a session' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Session updated successfully.',
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Session not found.',
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid input data or session does not belong to event.',
  })
  update(
    @Param('eventId') eventId: string,
    @Param('sessionId') sessionId: string,
    @Body() updateEventSessionDto: UpdateEventSessionDto,
  ) {
    return this.eventSessionsService.update(eventId, sessionId, updateEventSessionDto);
  }

  @Delete(':sessionId')
  @EventOrganizerAccess()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a session' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ 
    status: 204, 
    description: 'Session deleted successfully.',
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Session not found.',
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Session does not belong to event.',
  })
  async remove(
    @Param('eventId') eventId: string,
    @Param('sessionId') sessionId: string,
  ) {
    await this.eventSessionsService.remove(eventId, sessionId);
  }
}
