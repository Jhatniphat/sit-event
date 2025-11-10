import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Public } from "nest-keycloak-connect";
import { 
  Roles, 
  AdminOnly, 
  EventOrganizerAccess, 
  CurrentUser,
  type AuthenticatedUser,
  UserRole,
} from '../common';


@Controller('events')
export class EventsController {
  constructor(private readonly eventService: EventsService) {}

  @Post()
  @EventOrganizerAccess()
  async createEvent(
    @Body() createEventDto: CreateEventDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.eventService.create(createEventDto, user);
  }

  @Get()
  @Public()
  async getAllEvent(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.eventService.findAll({ page, limit });
  }

  
  @Get('/:id')
  @Public()
  async getEventById(@Param('id') id: string) {
    return this.eventService.findOne(id);
  }

  // Only event organizers and admins can update events
  @EventOrganizerAccess()
  @Patch(':id')
  updateEventById(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    return this.eventService.update(id, updateEventDto);
  }

  // Only admins can delete events
  @AdminOnly()
  @Delete(':id')
  deleteEventById(@Param('id') id: string) {
    return this.eventService.remove(id);
  }
}

