import { ConflictException, Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { UsersService } from 'src/users/users.service';
import { AuthenticatedUser } from 'src/common/decorators/current-user.decorator';
import { ApplyToBeStaffDto } from './dto/apply-staff.dto';
import { AddStaffDto } from './dto/add-staff.dto';

@Injectable()
export class EventStaffsService {
  private readonly logger = new Logger(EventStaffsService.name);

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async createApplication(
    eventId: string,
    authenticatedUser: AuthenticatedUser,
    dto: ApplyToBeStaffDto,
  ) {
    const user = await this.usersService.findByEmail(authenticatedUser.email);
    if (!user) {
      this.logger.error(
        `User not found by email: ${authenticatedUser.email}`,
      );
      throw new NotFoundException(
        `User with email '${authenticatedUser.email}' not found in database.`,
      );
    }

    // ✅ Validate that the authenticated user's email matches the found user
    if (user.email !== authenticatedUser.email) {
      this.logger.warn(
        `Email mismatch - authenticated: ${authenticatedUser.email}, database: ${user.email}`,
      );
      throw new BadRequestException('Email mismatch with authenticated user');
    }

    // Check if event exists
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      this.logger.error(`Event not found: ${eventId}`);
      throw new NotFoundException(`Event with ID '${eventId}' not found.`);
    }

    // Check if application already exists
    const existingApplication = await this.prisma.eventStaff.findFirst({
      where: {
        eventId: eventId,
        userId: user.id,
      },
    });

    // If exists and is withdrawn, update it to pending
    if (existingApplication) {
      if (existingApplication.status === 'WITHDRAWN') {
        this.logger.log(
          `Reactivating withdrawn application for userId: ${user.id}, eventId: ${eventId}`,
        );
        return this.prisma.eventStaff.update({
          where: { id: existingApplication.id },
          data: {
            eventRole: dto.eventRole,
            status: 'PENDING',
          },
        });
      } else {
        this.logger.warn(
          `User ${user.id} already has active application for event ${eventId} with status ${existingApplication.status}`,
        );
        throw new ConflictException('You already have an active application for this event');
      }
    }

    // Create new application if none exists
    this.logger.log(
      `Creating new staff application for userId: ${user.id}, eventId: ${eventId}, role: ${dto.eventRole}`,
    );
    return this.prisma.eventStaff.create({
      data: {
        event: {
          connect: { id: eventId },
        },
        user: {
          connect: { id: user.id },
        },
        eventRole: dto.eventRole,
        status: 'PENDING',
      },
    });
  }

  async findMyApplication(
    authenticatedUser: AuthenticatedUser,
  ) {
    const user = await this.usersService.findByEmail(authenticatedUser.email);
    if (!user) {
      throw new NotFoundException(
        `User with email '${authenticatedUser.email}' not found in database.`,
      );
    }

    return this.prisma.eventStaff.findMany({
      where: {
        userId: user.id,
        status: {
          not: 'WITHDRAWN', // Don't show withdrawn applications
        },
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            description: true,
            eventStartDate: true,
            eventEndDate: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async removeMyApplication(
    eventId: string,
    authenticatedUser: AuthenticatedUser,
  ) {
    const user = await this.usersService.findByEmail(authenticatedUser.email);
    if (!user) {
      throw new NotFoundException(
        `User with email '${authenticatedUser.email}' not found in database.`,
      );
    }

    // Find the active application
    const application = await this.prisma.eventStaff.findFirst({
      where: {
        eventId: eventId,
        userId: user.id,
        status: {
          in: ['PENDING', 'ACCEPTED'], // Only allow withdrawal of pending or accepted applications
        },
      },
    });

    if (!application) {
      throw new NotFoundException('No active staff application found for this event');
    }

    // Update status to withdrawn instead of deleting
    return this.prisma.eventStaff.update({
      where: { id: application.id },
      data: {
        status: 'WITHDRAWN',
      },
    });
  }

  async findAllByEventId(eventId: string) {
    return this.prisma.eventStaff.findMany({
      where: {
        eventId: eventId,
        status: {
          not: 'WITHDRAWN', // Don't show withdrawn applications to organizers
        },
      },
      include: {
        user: true,
      },
    });
  }

  async createStaffEntry(eventId: string, userId: string, dto: AddStaffDto) {
    // ✅ Validate userId is not empty
    if (!userId || userId.trim() === '') {
      this.logger.error('Invalid userId provided - empty or null');
      throw new BadRequestException('userId is required and cannot be empty');
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      this.logger.error(`User not found with ID: ${userId}`);
      throw new NotFoundException(`User with ID '${userId}' not found in database.`);
    }

    // Check if event exists
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      this.logger.error(`Event not found with ID: ${eventId}`);
      throw new NotFoundException(`Event with ID '${eventId}' not found in database.`);
    }

    // Check if staff entry already exists
    const existingStaff = await this.prisma.eventStaff.findFirst({
      where: {
        eventId: eventId,
        userId: userId,
      },
    });

    // If exists and is withdrawn, update it
    if (existingStaff) {
      if (existingStaff.status === 'WITHDRAWN') {
        this.logger.log(
          `Reactivating withdrawn staff entry for userId: ${userId}, eventId: ${eventId}`,
        );
        return this.prisma.eventStaff.update({
          where: { id: existingStaff.id },
          data: {
            eventRole: dto.eventRole || existingStaff.eventRole,
            status: 'ACCEPTED',
          },
        });
      } else {
        this.logger.warn(
          `Staff entry already exists: userId ${userId}, eventId ${eventId}, status: ${existingStaff.status}`,
        );
        throw new ConflictException(
          'User already has an active staff entry for this event',
        );
      }
    }

    // Create new staff entry if none exists
    this.logger.log(
      `Creating new staff entry for userId: ${userId}, eventId: ${eventId}, role: ${dto.eventRole || 'Staff'}`,
    );
    return this.prisma.eventStaff.create({
      data: {
        event: {
          connect: { id: eventId },
        },
        user: {
          connect: { id: userId },
        },
        eventRole: dto.eventRole || 'Staff',
        status: 'ACCEPTED',
      },
    });
  }

  async updateStaffStatus(
    eventId: string,
    staffId: string,
    status: 'ACCEPTED' | 'REFUSED',
  ) {
    // Check if the staff entry exists and belongs to the event
    const staffEntry = await this.prisma.eventStaff.findFirst({
      where: {
        id: staffId,
        eventId: eventId,
      },
    });

    if (!staffEntry) {
      this.logger.error(
        `Staff entry not found: staffId ${staffId}, eventId ${eventId}`,
      );
      throw new NotFoundException(
        `Staff entry with ID '${staffId}' not found for event '${eventId}'.`,
      );
    }

    // Update the status
    this.logger.log(
      `Updating staff status: staffId ${staffId}, eventId ${eventId}, status ${status}`,
    );
    return this.prisma.eventStaff.update({
      where: { id: staffId },
      data: { status: status },
    });
  }

  async removeStaffEntry(eventId: string, staffId: string) {
    // Check if the staff entry exists and belongs to the event
    const staffEntry = await this.prisma.eventStaff.findFirst({
      where: {
        id: staffId,
        eventId: eventId,
      },
    });

    if (!staffEntry) {
      this.logger.error(
        `Staff entry not found for deletion: staffId ${staffId}, eventId ${eventId}`,
      );
      throw new NotFoundException(
        `Staff entry with ID '${staffId}' not found for event '${eventId}'.`,
      );
    }

    // Delete the staff entry
    this.logger.log(
      `Deleting staff entry: staffId ${staffId}, eventId ${eventId}`,
    );
    return this.prisma.eventStaff.delete({
      where: { id: staffId },
    });
  }
}
