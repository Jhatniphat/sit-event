import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventService: EventsService) {}

  @Post()
  async createEvent(@Body() createEventDto: CreateEventDto) {
    return this.eventService.create(createEventDto);
  }

  @Get()
  async getAllEvent() {
    return this.eventService.findAll();
  }

  @Get('/:id')
  async getEventById(@Param('id') id: string) {
    return this.eventService.findOne(id);
  }

  @Patch(':id')
  updateEventById(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    return this.eventService.update(id, updateEventDto);
  }

  @Delete(':id')
  deleteEventById(@Param('id') id: string,) {
    return this.eventService.remove(id)
  }
}

