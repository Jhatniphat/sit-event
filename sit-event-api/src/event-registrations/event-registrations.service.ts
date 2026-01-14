import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { EventRegistrationsGateway } from './event-registrations.gateway';

@Injectable()
export class EventRegistrationsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private eventRegistrationsGateway: EventRegistrationsGateway, 
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
        sessionId: null, // Ensure checking for main event registration
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
        // sessionId defaults to null
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
      include: { event: true, session: true }, // Include session detail if needed
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
    // Note: This might update both main event and sub-sessions if not careful.
    // Assuming this is an admin override action, it might be acceptable, 
    // or you might want to scope it to sessionId: null as well.
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

  async checkUserQrStatus(eventId: string, userId: string) {
    const isActive = this.eventRegistrationsGateway.isUserActive(userId);

    const registration = await this.prisma.eventRegistration.findFirst({
        where: { eventId, userId },
        select: { id: true }
    });

    if (!registration) {
          throw new NotFoundException('User has not registered for this event');
    }

    return {
      isActive: isActive,
      userId: userId,
      eventId: eventId
    };
  }

  // --- Check In Logic (Updated for Main Event Only) ---
  async checkInUser(eventId: string, userId: string) {
    // 1. ค้นหาใบสมัคร Event หลัก (sessionId ต้องเป็น null)
    const registration = await this.prisma.eventRegistration.findFirst({
      where: {
        eventId: eventId,
        userId: userId,
        sessionId: null, // สำคัญ: ระบุว่าเป็น Event หลัก
      },
      include: {
        event: true,
      }
    });
    
    if (!registration) {
      throw new NotFoundException('Main event registration not found for this user.');
    }

    if (registration.attended) {
        // อาจจะ throw error หรือ return เดิมก็ได้ตาม Business logic ว่าจะให้แจ้งเตือนซ้ำไหม
        // ในที่นี้ return ค่าเดิมไปเลย
        return registration; 
    }

    // 2. อัปเดต attended = true
    const updatedRegistration = await this.prisma.eventRegistration.update({
      where: { id: registration.id },
      data: {
        attended: true,
        checkedInAt: new Date(),
      },
    });

    // 3. ส่ง Socket Notification
    this.eventRegistrationsGateway.notifyCheckInSuccess(
        userId, 
        eventId, 
        registration.event.name
    );

    return updatedRegistration;
  }

  // --- Check In Logic (New for Sub-Session) ---
  async checkInUserSession(eventId: string, userId: string, sessionId: string) {
    // 1. ตรวจสอบก่อนว่า Check-in Event หลักหรือยัง
    const mainRegistration = await this.prisma.eventRegistration.findFirst({
      where: {
        eventId: eventId,
        userId: userId,
        sessionId: null,
      },
    });

    if (!mainRegistration) {
      throw new NotFoundException('User is not registered for the main event.');
    }

    if (!mainRegistration.attended) {
      throw new BadRequestException('User must check-in at the main event first.');
    }

    // 2. ค้นหาใบสมัครของ Session นั้นๆ
    const sessionRegistration = await this.prisma.eventRegistration.findFirst({
      where: {
        eventId: eventId,
        userId: userId,
        sessionId: sessionId,
      },
      include: {
        session: true, // เพื่อเอาชื่อ Session ไปแสดง (ถ้ามี)
        event: true,
      }
    });

    if (!sessionRegistration) {
      throw new NotFoundException('Registration for this session not found.');
    }

    // 3. อัปเดต attended = true
    const updatedSessionRegistration = await this.prisma.eventRegistration.update({
      where: { id: sessionRegistration.id },
      data: {
        attended: true,
        checkedInAt: new Date(),
      },
    });

    // 4. ส่ง Socket Notification (ระบุว่าเป็น Session Check-in)
    // คุณอาจจะปรับ notifyCheckInSuccess ให้รับ parameter เพิ่ม หรือส่งเป็น format ชื่อ "Event - Session Name"
    const notificationName = sessionRegistration.session 
      ? `${sessionRegistration.event.name} - ${sessionRegistration.session.name}` 
      : sessionRegistration.event.name;

    this.eventRegistrationsGateway.notifyCheckInSuccess(
        userId, 
        eventId, 
        notificationName
    );

    return updatedSessionRegistration;
  }
}