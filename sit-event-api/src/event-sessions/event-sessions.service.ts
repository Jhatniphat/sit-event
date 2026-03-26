import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { CreateEventSessionDto } from './dto/create-event-session.dto';
import { UpdateEventSessionDto } from './dto/update-event-session.dto';
import { PrismaService } from '../prisma.service';
import { EventSession, EventRegistration, FormType, RegistrationStatus } from 'generated/prisma';
import { UsersService } from '../users/users.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import {
  SessionParticipantDto,
  EventParticipantDto,
  PaginatedParticipantsDto,
  PaginatedEventParticipantsDto,
  PaginatedSessionParticipantsDto,
  EventSummaryStats,
  SessionSummaryStats,
} from './dto/session-participant.dto';

@Injectable()
export class EventSessionsService {
  private readonly logger = new Logger(EventSessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async create(eventId: string, createEventSessionDto: CreateEventSessionDto): Promise<EventSession> {
    // ตรวจสอบว่า event มีอยู่จริง
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID '${eventId}' not found`);
    }

    // ตรวจสอบว่า startTime ต้องมาก่อน endTime
    const startTime = new Date(createEventSessionDto.startTime);
    const endTime = new Date(createEventSessionDto.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    // สร้าง session โดยกำหนด availableSeats เท่ากับ maxSeats
    return this.prisma.eventSession.create({
      data: {
        eventId,
        name: createEventSessionDto.name,
        description: createEventSessionDto.description,
        startTime,
        endTime,
        location: createEventSessionDto.location,
        maxSeats: createEventSessionDto.maxSeats,
        availableSeats: createEventSessionDto.maxSeats,
        pointsAwarded: createEventSessionDto.pointsAwarded,
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findAllByEvent(eventId: string): Promise<EventSession[]> {
    // ตรวจสอบว่า event มีอยู่จริง
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID '${eventId}' not found`);
    }

    return this.prisma.eventSession.findMany({
      where: { eventId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  async findOne(eventId: string, sessionId: string): Promise<EventSession> {
    const session = await this.prisma.eventSession.findUnique({
      where: { id: sessionId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        registrations: {
          select: {
            id: true,
            userId: true,
            registeredAt: true,
            attended: true,
            checkedInAt: true,
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID '${sessionId}' not found`);
    }

    // ตรวจสอบว่า session นี้อยู่ใน event ที่ระบุ
    if (session.eventId !== eventId) {
      throw new NotFoundException(
        `Session with ID '${sessionId}' does not belong to event '${eventId}'`,
      );
    }

    return session;
  }

  async registerToSession(
    eventId: string,
    sessionId: string,
    authenticatedUser: AuthenticatedUser,
  ): Promise<EventRegistration> {
    // ตรวจสอบว่า session มีอยู่จริง
    const session = await this.prisma.eventSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID '${sessionId}' not found`);
    }

    // ตรวจสอบว่า session อยู่ใน event ที่ระบุ
    if (session.eventId !== eventId) {
      throw new BadRequestException(
        `Session with ID '${sessionId}' does not belong to event '${eventId}'`,
      );
    }

    // ตรวจสอบว่ามีที่ว่าง (Bypassed)
    // if (session.availableSeats <= 0) {
    //   throw new BadRequestException('No available seats for this session');
    // }

    // หา user
    const user = await this.usersService.findByEmail(authenticatedUser.email);
    if (!user) {
      throw new NotFoundException(
        `User with email '${authenticatedUser.email}' not found in database.`,
      );
    }

    // ตรวจสอบว่า user ลงทะเบียน event แล้วหรือยัง
    const eventRegistration = await this.prisma.eventRegistration.findFirst({
      where: {
        eventId: eventId,
        userId: user.id,
        sessionId: null, // Check main event registration
      },
      include: {
        event: {
          include: {
            forms: true,
          },
        },
      },
    });

    if (!eventRegistration) {
      throw new BadRequestException(
        'You must register for the event before registering for a session',
      );
    }

    // Check pre-event form
    const hasActivePreEventForm = eventRegistration.event.forms.some(
      (f) => f.type === FormType.PRE_EVENT && f.isActive,
    );
    const initialStatus = hasActivePreEventForm
      ? RegistrationStatus.PENDING
      : RegistrationStatus.APPROVED;

    // ตรวจสอบว่าลงทะเปียน session นี้แล้วหรือยัง
    const existingSessionRegistration = await this.prisma.eventRegistration.findFirst({
      where: {
        eventId: eventId,
        userId: user.id,
        sessionId: sessionId,
      },
    });

    if (existingSessionRegistration) {
      throw new ConflictException(
        'You are already registered for this session',
      );
    }

    // สร้าง registration สำหรับ session
    const registration = await this.prisma.eventRegistration.create({
      data: {
        eventId,
        userId: user.id,
        sessionId,
        status: initialStatus,
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        session: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            location: true,
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

    // ลดจำนวน availableSeats
    await this.prisma.eventSession.update({
      where: { id: sessionId },
      data: {
        availableSeats: {
          decrement: 1,
        },
      },
    });

    return registration;
  }

  async update(
    eventId: string,
    sessionId: string,
    updateEventSessionDto: UpdateEventSessionDto,
  ): Promise<EventSession> {
    // ตรวจสอบว่า session มีอยู่จริง
    const session = await this.prisma.eventSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID '${sessionId}' not found`);
    }

    // ตรวจสอบว่า session อยู่ใน event ที่ระบุ
    if (session.eventId !== eventId) {
      throw new BadRequestException(
        `Session with ID '${sessionId}' does not belong to event '${eventId}'`,
      );
    }

    // ตรวจสอบ startTime และ endTime ถ้ามีการอัพเดท
    if (updateEventSessionDto.startTime || updateEventSessionDto.endTime) {
      const startTime = updateEventSessionDto.startTime
        ? new Date(updateEventSessionDto.startTime)
        : session.startTime;
      const endTime = updateEventSessionDto.endTime
        ? new Date(updateEventSessionDto.endTime)
        : session.endTime;

      if (startTime >= endTime) {
        throw new BadRequestException('Start time must be before end time');
      }
    }

    // ตรวจสอบ maxSeats ถ้ามีการเปลี่ยน
    if (updateEventSessionDto.maxSeats !== undefined) {
      const registeredCount = session.maxSeats - session.availableSeats;
      if (updateEventSessionDto.maxSeats < registeredCount) {
        throw new BadRequestException(
          `Cannot reduce maxSeats to ${updateEventSessionDto.maxSeats}. Already have ${registeredCount} registrations.`,
        );
      }
    }

    // อัพเดท session
    const updateData: any = {};

    if (updateEventSessionDto.name !== undefined) {
      updateData.name = updateEventSessionDto.name;
    }
    if (updateEventSessionDto.description !== undefined) {
      updateData.description = updateEventSessionDto.description;
    }
    if (updateEventSessionDto.startTime) {
      updateData.startTime = new Date(updateEventSessionDto.startTime);
    }
    if (updateEventSessionDto.endTime) {
      updateData.endTime = new Date(updateEventSessionDto.endTime);
    }
    if (updateEventSessionDto.location !== undefined) {
      updateData.location = updateEventSessionDto.location;
    }
    if (updateEventSessionDto.maxSeats !== undefined) {
      const registeredCount = session.maxSeats - session.availableSeats;
      updateData.maxSeats = updateEventSessionDto.maxSeats;
      updateData.availableSeats = updateEventSessionDto.maxSeats - registeredCount;
    }
    if (updateEventSessionDto.pointsAwarded !== undefined) {
      updateData.pointsAwarded = updateEventSessionDto.pointsAwarded;
    }

    return this.prisma.eventSession.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        event: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(eventId: string, sessionId: string): Promise<void> {
    // ตรวจสอบว่า session มีอยู่จริง
    const session = await this.prisma.eventSession.findUnique({
      where: { id: sessionId },
      include: {
        registrations: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID '${sessionId}' not found`);
    }

    // ตรวจสอบว่า session อยู่ใน event ที่ระบุ
    if (session.eventId !== eventId) {
      throw new BadRequestException(
        `Session with ID '${sessionId}' does not belong to event '${eventId}'`,
      );
    }

    // เตือนถ้ามีคนลงทะเบียนแล้ว (optional - อาจจะให้ลบได้หรือไม่ก็ได้)
    if (session.registrations.length > 0) {
      // ถ้าไม่ต้องการให้ลบเมื่อมีคนลงทะเบียน ให้ uncomment บรรทัดนี้
      // throw new BadRequestException(
      //   `Cannot delete session. Already have ${session.registrations.length} registrations.`,
      // );
    }

    // ลบ session (registrations จะถูกลบอัตโนมัติเพราะมี onDelete: Cascade ใน schema)
    await this.prisma.eventSession.delete({
      where: { id: sessionId },
    });
  }

  async getUserRegisteredSessions(eventId: string, userId: string) {
    // ตรวจสอบว่า event มีอยู่จริง
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID '${eventId}' not found`);
    }

    // ตรวจสอบว่า user มีอยู่จริง
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    // ดึงรายการ registrations ที่มี sessionId (ไม่เอาที่เป็น event registration)
    const registrations = await this.prisma.eventRegistration.findMany({
      where: {
        eventId,
        userId,
        sessionId: {
          not: null,
        },
      },
      include: {
        session: {
          select: {
            id: true,
            name: true,
            description: true,
            startTime: true,
            endTime: true,
            location: true,
            maxSeats: true,
            availableSeats: true,
            pointsAwarded: true,
          },
        },
      },
      orderBy: {
        session: {
          startTime: 'asc',
        },
      },
    });

    return {
      eventId,
      userId,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      sessions: registrations.map((reg) => ({
        registrationId: reg.id,
        sessionId: reg.sessionId,
        registeredAt: reg.registeredAt,
        attended: reg.attended,
        checkedInAt: reg.checkedInAt,
        session: reg.session,
      })),
    };
  }

  /**
   * Get participants registered for a specific session with summary stats
   * Supports pagination and search by firstName, lastName, or email
   * @param eventId - Event ID
   * @param sessionId - Session ID
   * @param page - Page number (1-indexed, default: 1)
   * @param limit - Number of records per page (default: 20)
   * @param search - Search keyword for firstName, lastName, or email
   */
  async getSessionParticipants(
    eventId: string,
    sessionId: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ): Promise<PaginatedSessionParticipantsDto> {
    // ✅ Validate event exists
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      this.logger.error(`Event not found: ${eventId}`);
      throw new NotFoundException(`Event with ID '${eventId}' not found`);
    }

    // ✅ Validate session exists and belongs to event
    const session = await this.prisma.eventSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      this.logger.error(`Session not found: ${sessionId}`);
      throw new NotFoundException(`Session with ID '${sessionId}' not found`);
    }

    if (session.eventId !== eventId) {
      this.logger.error(
        `Session ${sessionId} does not belong to event ${eventId}`,
      );
      throw new NotFoundException(
        `Session with ID '${sessionId}' does not belong to event '${eventId}'`,
      );
    }

    // ✅ Build base where clause
    const baseWhere = {
      eventId,
      sessionId,
    };

    // ✅ Get all registrations with user data (for search filtering)
    const allRegistrations = await this.prisma.eventRegistration.findMany({
      where: baseWhere,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // ✅ Filter by search term if provided
    let filteredRegistrations = allRegistrations;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredRegistrations = allRegistrations.filter((reg) => {
        const firstName = reg.user.firstName.toLowerCase();
        const lastName = reg.user.lastName.toLowerCase();
        const email = reg.user.email.toLowerCase();

        return (
          firstName.includes(searchLower) ||
          lastName.includes(searchLower) ||
          email.includes(searchLower)
        );
      });
    }

    const total = filteredRegistrations.length;

    // ✅ Calculate summary stats
    const totalAttended = filteredRegistrations.filter((reg) => reg.attended).length;
    const totalApproved = filteredRegistrations.filter((reg) => reg.status === RegistrationStatus.APPROVED).length;
    const totalPending = filteredRegistrations.filter((reg) => reg.status === RegistrationStatus.PENDING).length;
    const totalRejected = filteredRegistrations.filter((reg) => reg.status === RegistrationStatus.REJECTED).length;
    const attendanceRate = total > 0 ? Math.round((totalAttended / total) * 100) : 0;

    const summary: SessionSummaryStats = {
      sessionId,
      sessionName: session.name,
      maxSeats: session.maxSeats,
      availableSeats: session.availableSeats,
      totalRegistered: total,
      totalAttended,
      totalApproved,
      totalPending,
      totalRejected,
      attendanceRate: `${attendanceRate}%`,
    };

    // ✅ Calculate pagination
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // ✅ Apply pagination
    const paginatedRegistrations = filteredRegistrations.slice(
      skip,
      skip + limit,
    );

    // ✅ Map to response DTOs
    const participants: SessionParticipantDto[] = paginatedRegistrations.map(
      (reg) => ({
        userId: reg.user.id,
        firstName: reg.user.firstName,
        lastName: reg.user.lastName,
        email: reg.user.email,
        status: reg.status as 'PENDING' | 'APPROVED' | 'REJECTED',
        attended: reg.attended,
        checkedInAt: reg.checkedInAt,
        registeredAt: reg.registeredAt,
      }),
    );

    this.logger.log(
      `Fetched ${participants.length}/${total} participants for session ${sessionId}, event ${eventId}${search ? ` (search: "${search}")` : ''}`,
    );

    return {
      summary,
      data: participants,
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

  /**
   * Get all participants registered for an event (across all sessions and general event)
   * Supports pagination and search by firstName, lastName, or email
   * @param eventId - Event ID
   * @param page - Page number (1-indexed, default: 1)
   * @param limit - Number of records per page (default: 20)
   * @param search - Search keyword for firstName, lastName, or email
   */
  async getEventParticipants(
    eventId: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ): Promise<PaginatedEventParticipantsDto> {
    // ✅ Validate event exists
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      this.logger.error(`Event not found: ${eventId}`);
      throw new NotFoundException(`Event with ID '${eventId}' not found`);
    }

    // ✅ Get all registrations for this event (both session-specific and general)
    const allRegistrations = await this.prisma.eventRegistration.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        session: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // ✅ Filter by search term if provided
    let filteredRegistrations = allRegistrations;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredRegistrations = allRegistrations.filter((reg) => {
        const firstName = reg.user.firstName.toLowerCase();
        const lastName = reg.user.lastName.toLowerCase();
        const email = reg.user.email.toLowerCase();

        return (
          firstName.includes(searchLower) ||
          lastName.includes(searchLower) ||
          email.includes(searchLower)
        );
      });
    }

    const total = filteredRegistrations.length;

    // ✅ Calculate summary stats
    const totalAttended = filteredRegistrations.filter((reg) => reg.attended).length;
    const totalApproved = filteredRegistrations.filter((reg) => reg.status === RegistrationStatus.APPROVED).length;
    const totalPending = filteredRegistrations.filter((reg) => reg.status === RegistrationStatus.PENDING).length;
    const totalRejected = filteredRegistrations.filter((reg) => reg.status === RegistrationStatus.REJECTED).length;
    const attendanceRate = total > 0 ? Math.round((totalAttended / total) * 100) : 0;

    const summary: EventSummaryStats = {
      totalRegistered: total,
      totalAttended,
      totalApproved,
      totalPending,
      totalRejected,
      attendanceRate: `${attendanceRate}%`,
    };

    // ✅ Calculate pagination
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // ✅ Apply pagination
    const paginatedRegistrations = filteredRegistrations.slice(
      skip,
      skip + limit,
    );

    // ✅ Map to response DTOs
    const participants: EventParticipantDto[] = paginatedRegistrations.map(
      (reg) => ({
        userId: reg.user.id,
        firstName: reg.user.firstName,
        lastName: reg.user.lastName,
        email: reg.user.email,
        status: reg.status as 'PENDING' | 'APPROVED' | 'REJECTED',
        attended: reg.attended,
        sessionId: reg.sessionId,
        sessionName: reg.session?.name ?? null,
        checkedInAt: reg.checkedInAt,
        registeredAt: reg.registeredAt,
      }),
    );

    this.logger.log(
      `Fetched ${participants.length}/${total} participants for event ${eventId}${search ? ` (search: "${search}")` : ''}`,
    );

    return {
      summary,
      data: participants,
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
}
