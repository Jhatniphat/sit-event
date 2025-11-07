import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Event, Prisma } from 'generated/prisma';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UsersService } from '../users/users.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
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

  async findAll(): Promise<Event[]> {
    return this.prisma.event.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });
    if (!event) {
      throw new NotFoundException(`Event with ID '${id}' not found.`);
    }
    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    await this.findOne(id);

    return this.prisma.event.update({
      where: {
        id,
      },
      data: {
        ...updateEventDto,
      },
    });
  } 

  async remove(id:string): Promise<Event> {
    await this.findOne(id)
    return this.prisma.event.delete({
      where: {
        id
      }
    })
  }

}
