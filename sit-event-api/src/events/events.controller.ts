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
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Public } from "nest-keycloak-connect";
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { 
  Roles, 
  AdminOnly, 
  EventOrganizerAccess, 
  CurrentUser,
  type AuthenticatedUser,
  UserRole,
} from '../common';
import { MinioClientService } from '../minio/minio-client.service';

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventService: EventsService,
    private readonly minioClientService: MinioClientService,
  ) {}

  @Post()
  @EventOrganizerAccess()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'images', maxCount: 5 },
      { name: 'thumbnail', maxCount: 1 },
    ]),
  )
  async createEvent(
    @UploadedFiles() files: { thumbnail?: Express.Multer.File[], images?: Express.Multer.File[] },
    @Body() createEventDto: CreateEventDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    let thumbnailFileName = '';
    if (files.thumbnail && files.thumbnail.length > 0) {
      const uploadResult = await this.minioClientService.uploadFile(files.thumbnail[0]);
      thumbnailFileName = uploadResult.fileName;
    }

    let imageFileNames: string[] = [];
    if (files.images && files.images.length > 0) {
      const uploadPromises = files.images.map(file => 
        this.minioClientService.uploadFile(file)
      );
      const results = await Promise.all(uploadPromises);
      imageFileNames = results.map(res => res.fileName);
    }

    const eventData = {
      ...createEventDto,
      thumbnail: thumbnailFileName, 
      images: imageFileNames,     
    };
    return this.eventService.create(eventData, user);
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
  
  @Patch(':id')
  @EventOrganizerAccess()
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

