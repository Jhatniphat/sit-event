import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class EventRegistrationsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async registerUserToEvent(
    eventId: string,
    authenticatedUser: AuthenticatedUser,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException(`Event with ID '${eventId}' not found.`);
    }
    const user = await this.usersService.findByEmail(authenticatedUser.email);
    if (!user) {
      throw new NotFoundException(
        `User with email '${authenticatedUser.email}' not found in database.`,
      );
    }
    const existingRegistration = await this.prisma.eventRegistration.findFirst({
      where: {
        eventId: eventId,
        userId: user.id,
      },
    });
    if (existingRegistration) {
      throw new ConflictException('You are already registered for this event');
    }

    return this.prisma.eventRegistration.create({
      data: {
        event: {
          connect: { id: eventId },
        },
        user: {
          connect: { id: user.id },
        },
      },
    });
  }

  async unregisterUserFromEvent(
    eventId: string,
    authenticatedUser: AuthenticatedUser,
  ) {
    const user = await this.usersService.findByEmail(authenticatedUser.email);
    if (!user) {
      throw new NotFoundException(
        `User with email '${authenticatedUser.email}' not found in database.`,
      );
    }
    const deleteResult = await this.prisma.eventRegistration.deleteMany({
      where: {
        eventId: eventId,
        userId: user.id,
      },
    });
    if (deleteResult.count === 0) {
      throw new NotFoundException(
        'Registration not found for this user and event.',
      );
    }
    return deleteResult;
  }

  async findMyRegistration(authenticatedUser: AuthenticatedUser) {
    const user = await this.usersService.findByEmail(authenticatedUser.email);
    if (!user) {
      throw new NotFoundException(
        `User with email '${authenticatedUser.email}' not found in database.`,
      );
    }
    return this.prisma.eventRegistration.findMany({
      where: {
        userId: user.id,
      },
      include: { event: true },
    });
  }

  async cancelRegistrationById(registrationId: string) {
    return this.prisma.eventRegistration.delete({
      where: { id: registrationId },
    });
  }

  async changeAttendedStatusByRegistrationId(
    eventId: string,
    registrationId: string,
    attended: boolean,
  ) {
    return this.prisma.eventRegistration.update({
      where: { eventId: eventId, id: registrationId },
      data: { attended },
    });
  }

  async changeAttendedStatusByUserId(
    eventId: string,
    userId: string,
    attended: boolean,
  ) {
    return this.prisma.eventRegistration.updateMany({
      where: { eventId: eventId, userId: userId },
      data: { attended },
    });
  }

  async getRegistrationsByEventId(eventId: string) {
    return this.prisma.eventRegistration.findMany({
      where: { eventId },
      include: { user: true },
    });
  }
}
