import {
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

  async checkUserQrStatus(eventId: string, userId: string) {
    // 1. เช็คว่า User เปิด Socket (หน้า QR) ค้างไว้ไหม
    const isActive = this.eventRegistrationsGateway.isUserActive(userId);

    // Optional: คุณอาจจะเช็คเพิ่มด้วยว่า User นี้ลงทะเบียน Event นี้จริงไหม
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

  // --- Check In Logic (Updated) ---
  async checkInUser(eventId: string, userId: string) {
    // 1. ค้นหาใบสมัคร (รวม Event เพื่อเอาชื่อ Event มาแสดงตอนแจ้งเตือน)
    const registration = await this.prisma.eventRegistration.findFirst({
      where: {
        eventId: eventId,
        userId: userId,
      },
      include: {
        event: true, // ดึงข้อมูล Event ด้วย
      }
    });
    
    if (!registration) {
      throw new NotFoundException('Registration not found for this user and event.');
    }

    // 2. อัปเดต attended = true
    const updatedRegistration = await this.prisma.eventRegistration.update({
      where: { id: registration.id },
      data: {
        attended: true,
        checkedInAt: new Date(),
      },
    });

    // 3. [NEW] ส่ง Socket Notification กลับไปหา Participant
    // แจ้งว่า "Check-in สำเร็จแล้วนะ"
    this.eventRegistrationsGateway.notifyCheckInSuccess(
        userId, 
        eventId, 
        registration.event.name // ส่งชื่อ Event ไปโชว์
    );

    return updatedRegistration;
  }
}
