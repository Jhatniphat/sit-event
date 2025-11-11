import { Injectable } from '@nestjs/common';
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
    const user = await this.usersService.findByEmail(authenticatedUser.email);
    if (!user) {
      throw new Error(
        `User with email '${authenticatedUser.email}' not found in database.`,
      );
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
      throw new Error(
        `User with email '${authenticatedUser.email}' not found in database.`,
      );
    }
    return this.prisma.eventRegistration.deleteMany({
      where: {
        eventId: eventId,
        userId: user.id,
      },
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
