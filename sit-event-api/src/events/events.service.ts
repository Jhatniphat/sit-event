import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

  // src/events/events.service.ts

  async update(
    id: string, 
    updateEventDto: UpdateEventDto, 
    authenticatedUser?: AuthenticatedUser,
    newThumbnailName?: string, 
    uploadedImageNames?: string[] // รับชื่อไฟล์ใหม่ที่เพิ่งอัปโหลดเสร็จ
  ) {
    // 1. ดึงข้อมูลเดิมจาก DB
    const existingEvent = await this.prisma.event.findUnique({ where: { id } });
    if (!existingEvent) {
      throw new NotFoundException(`Event with ID '${id}' not found.`);
    }

    if (authenticatedUser) {
      const user = await this.usersService.findByEmail(authenticatedUser.email);
      
      if (!user) {
        throw new NotFoundException(`User with email '${authenticatedUser.email}' not found.`);
      }

      // Add validation logic here if needed (e.g., check if user is event creator or admin)
    }

    // --- ส่วนจัดการ THUMBNAIL ---
    if (newThumbnailName && existingEvent.thumbnail) {
      // ลบไฟล์ thumbnail เก่าออกจาก MinIO
      await this.minioClientService.deleteFile(existingEvent.thumbnail);
    }

    let finalImages: string[] = [];

    if (uploadedImageNames && uploadedImageNames.length > 0) {
      if (existingEvent.images && existingEvent.images.length > 0) {
        await Promise.all(
          existingEvent.images.map(img => this.minioClientService.deleteFile(img))
        );
      }
      
      finalImages = [...uploadedImageNames];
      
    } else if (updateEventDto.images !== undefined) {
      const keptImages = updateEventDto.images || [];
      if (existingEvent.images && existingEvent.images.length > 0) {
        const imagesToDelete = existingEvent.images.filter(
          (oldImg) => !keptImages.includes(oldImg)
        );
        if (imagesToDelete.length > 0) {
          await Promise.all(imagesToDelete.map(img => this.minioClientService.deleteFile(img)));
        }
      }

      finalImages = [...keptImages];
      
    } else {
      finalImages = [...(existingEvent.images || [])];
    }

    const cleanData = {
      ...updateEventDto,
      images: finalImages,
    };
    
    if (!newThumbnailName) {
        delete cleanData.thumbnail;
    }

    const updatedEvent = await this.prisma.event.update({
      where: { id },
      data: cleanData,
    });

    return this.transformEventWithUrls(updatedEvent);
  }

  async remove(id: string): Promise<Event> {
    // ดึงข้อมูล event ก่อนลบ (ใช้ raw data จาก DB ไม่ใช่ transformed URLs)
    const existingEvent = await this.prisma.event.findUnique({
      where: { id },
    });
    
    if (!existingEvent) {
      throw new NotFoundException(`Event with ID '${id}' not found.`);
    }

    // ลบ thumbnail จาก MinIO (ถ้ามี)
    if (existingEvent.thumbnail) {
      await this.minioClientService.deleteFile(existingEvent.thumbnail);
    }

    // ลบ images ทั้งหมดจาก MinIO (ถ้ามี)
    if (existingEvent.images && existingEvent.images.length > 0) {
      await Promise.all(
        existingEvent.images.map(image => this.minioClientService.deleteFile(image))
      );
    }

    // ลบ event จากฐานข้อมูล
    return this.prisma.event.delete({
      where: {
        id
      }
    });
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