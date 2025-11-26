import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Event, Prisma, UserRole } from 'generated/prisma';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UsersService } from '../users/users.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { MinioClientService } from '../minio/minio-client.service';

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private minioClientService: MinioClientService,
  ) {}

  async create(createEventDto: CreateEventDto, authenticatedUser: AuthenticatedUser): Promise<Event> {
    const user = await this.usersService.findByEmail(authenticatedUser.email);
    if (!user) {
      throw new NotFoundException(`User with email '${authenticatedUser.email}' not found in database.`);
    }

    return this.prisma.event.create({
      data: {
        ...createEventDto,
        creator: {
          connect: {
            id: user.id,
          },
        },
      },
    });
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResult<Event>> {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination metadata
    const total = await this.prisma.event.count();

    // Get paginated results
    const events = await this.prisma.event.findMany({
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const eventWithUrls = await Promise.all(events.map((event) => this.transformEventWithUrls(event)));

    const totalPages = Math.ceil(total / limit);

    return {
      data: eventWithUrls,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });
    if (!event) {
      throw new NotFoundException(`Event with ID '${id}' not found.`);
    }
    return this.transformEventWithUrls(event);
  }

  async update(
    id: string, 
    updateEventDto: UpdateEventDto, 
    authenticatedUser?: AuthenticatedUser,
    thumbnailFile?: Express.Multer.File,
    imageFiles?: Express.Multer.File[]
  ) {
    // ดึงข้อมูล event เดิม
    const existingEvent = await this.prisma.event.findUnique({ where: { id } });
    if (!existingEvent) {
      throw new NotFoundException(`Event with ID '${id}' not found.`);
    }

    if (authenticatedUser) {
      const user = await this.usersService.findByEmail(authenticatedUser.email);
      if (!user) {
        throw new NotFoundException(`User with email '${authenticatedUser.email}' not found.`);
      }
    }

    let newThumbnailName: string | undefined = undefined;
    let newImageNames: string[] = [];

    // จัดการ THUMBNAIL: ถ้าส่งมา = ลบเก่า + upload ใหม่
    if (thumbnailFile) {
      // ลบรูปเก่าก่อน
      if (existingEvent.thumbnail) {
        this.logger.log(`Deleting old thumbnail: ${existingEvent.thumbnail}`);
        await this.minioClientService.deleteFile(existingEvent.thumbnail);
      }
      // upload รูปใหม่
      this.logger.log(`Uploading new thumbnail: ${thumbnailFile.originalname}`);
      const uploadResult = await this.minioClientService.uploadFile(thumbnailFile);
      newThumbnailName = uploadResult.fileName;
    }

    // จัดการ IMAGES: ถ้าส่งมา = ลบเก่าทั้งหมด + upload ใหม่
    if (imageFiles && imageFiles.length > 0) {
      // ลบรูปเก่าทั้งหมดก่อน
      if (existingEvent.images && existingEvent.images.length > 0) {
        this.logger.log(`Deleting ${existingEvent.images.length} old images`);
        await Promise.all(
          existingEvent.images.map(img => this.minioClientService.deleteFile(img))
        );
      }
      // upload รูปใหม่ทั้งหมด
      this.logger.log(`Uploading ${imageFiles.length} new images`);
      const uploadPromises = imageFiles.map(file => 
        this.minioClientService.uploadFile(file)
      );
      const results = await Promise.all(uploadPromises);
      newImageNames = results.map(res => res.fileName);
    }

    // เตรียมข้อมูลสำหรับ update
    const dataToUpdate: any = {
      ...updateEventDto,
    };

    // update thumbnail ถ้ามีการ upload ใหม่
    if (newThumbnailName) {
      dataToUpdate.thumbnail = newThumbnailName;
    }

    // update images ถ้ามีการ upload ใหม่, ไม่งั้นเก็บเดิม
    if (newImageNames.length > 0) {
      dataToUpdate.images = newImageNames;
    }

    const updatedEvent = await this.prisma.event.update({
      where: { id },
      data: dataToUpdate,
    });

    return this.transformEventWithUrls(updatedEvent);
  }

  async remove(id: string): Promise<Event> {
    this.logger.log(`Starting deletion of event with ID: ${id}`);
    
    // ดึงข้อมูล event ก่อนลบ (ใช้ raw data จาก DB ไม่ใช่ transformed URLs)
    const existingEvent = await this.prisma.event.findUnique({
      where: { id },
    });
    
    if (!existingEvent) {
      this.logger.warn(`Event with ID '${id}' not found`);
      throw new NotFoundException(`Event with ID '${id}' not found.`);
    }
    if (existingEvent.images && existingEvent.images.length > 0) {
      this.logger.log(`Images list: ${JSON.stringify(existingEvent.images)}`);
    }

    // ลบ thumbnail จาก MinIO (ถ้ามี)
    if (existingEvent.thumbnail) {
      this.logger.log(`Deleting thumbnail: ${existingEvent.thumbnail}`);
      try {
        await this.minioClientService.deleteFile(existingEvent.thumbnail);
        this.logger.log(`Successfully deleted thumbnail`);
      } catch (error) {
        this.logger.error(`Failed to delete thumbnail: ${error.message}`, error.stack);
      }
    }

    // ลบ images ทั้งหมดจาก MinIO (ถ้ามี)
    if (existingEvent.images && existingEvent.images.length > 0) {
      this.logger.log(`Deleting ${existingEvent.images.length} images from MinIO`);
      try {
        const deletePromises = existingEvent.images.map(async (image, index) => {
          try {
            await this.minioClientService.deleteFile(image);
          } catch (error) {
            this.logger.error(`Failed to delete image ${image}: ${error.message}`);
            throw error;
          }
        });
        await Promise.all(deletePromises);
      } catch (error) {
        this.logger.error(`Error during bulk image deletion: ${error.message}`, error.stack);
      }
    }

    // ลบ event จากฐานข้อมูล
    this.logger.log(`Deleting event from database`);
    const deletedEvent = await this.prisma.event.delete({
      where: {
        id
      }
    });
    
    this.logger.log(`Event deleted successfully from database`);
    return deletedEvent;
  }

  private async transformEventWithUrls(event: Event): Promise<Event> {
    const transformedEvent = { ...event };

    if (event.thumbnail) {
      transformedEvent.thumbnail = await this.minioClientService.getPresignedUrl(event.thumbnail);
    }

    if (event.images && event.images.length > 0) {
      const imageUrls = await Promise.all(
        event.images.map((image) => this.minioClientService.getPresignedUrl(image))
      );
      transformedEvent.images = imageUrls;
    }

    return transformedEvent;
  }
}