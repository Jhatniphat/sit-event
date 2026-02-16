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
import { RegistrationStatus } from '../../generated/prisma';
import { FormType } from 'generated/prisma';
import * as ExcelJS from 'exceljs';
import type { Response } from 'express';

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
      include: {
        forms: true, // Include forms to check for PRE_EVENT
      },
    });
    if (!event) {
      throw new NotFoundException(`Event with ID '${eventId}' not found.`);
    }

    // Check if there is an active Pre-Event form
    const hasActivePreEventForm = event.forms.some(
      (form) => form.type === FormType.PRE_EVENT && form.isActive,
    );

    // Determine registration status
    const initialStatus = hasActivePreEventForm
      ? RegistrationStatus.PENDING
      : RegistrationStatus.APPROVED;

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

    return this.prisma.$transaction(async (tx) => {
      // 1. Create registration for the main event
      const mainRegistration = await tx.eventRegistration.create({
        data: {
          event: { connect: { id: eventId } },
          user: { connect: { id: user.id } },
          status: initialStatus,
          // sessionId defaults to null
        },
      });

      // 2. Check for auto-register sessions
      const autoSessions = await tx.eventSession.findMany({
        where: {
          eventId: eventId,
          autoRegister: true,
        },
      });

      // 3. Register user to auto-register sessions (bypass seats for now)
      for (const session of autoSessions) {
        // if (session.availableSeats > 0) {
          // Check if already registered (shouldn't happen for new event reg, but good practice if logic changes)
           const existingSessionReg = await tx.eventRegistration.findUnique({
              where: {
                userId_eventId_sessionId: {
                  userId: user.id,
                  eventId: eventId,
                  sessionId: session.id
                }
              }
           });
           
           if (!existingSessionReg) {
              await tx.eventRegistration.create({
                data: {
                  event: { connect: { id: eventId } },
                  user: { connect: { id: user.id } },
                  session: { connect: { id: session.id } },
                  status: initialStatus,
                },
              });

              await tx.eventSession.update({
                where: { id: session.id },
                data: { availableSeats: { decrement: 1 } },
              });
           }
        // }
      }

      return mainRegistration;
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

    // Delete form submissions for this event
    const eventForms = await this.prisma.eventForm.findMany({
      where: { eventId },
      select: { id: true },
    });

    if (eventForms.length > 0) {
      const formIds = eventForms.map((f) => f.id);
      await this.prisma.eventFormSubmission.deleteMany({
        where: {
          userId: user.id,
          formId: { in: formIds },
        },
      });
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

  // =============================================
  // Approve Registration (Admin Only)
  // =============================================
  async approveRegistration(eventId: string, registrationId: string) {
    const registration = await this.prisma.eventRegistration.findFirst({
      where: { id: registrationId, eventId: eventId },
    });

    if (!registration) {
      throw new NotFoundException('Registration not found.');
    }

    if (registration.status === RegistrationStatus.APPROVED) {
      throw new BadRequestException('Registration is already approved.');
    }

    return this.prisma.eventRegistration.update({
      where: { id: registrationId },
      data: {
        status: RegistrationStatus.APPROVED,
        approvedAt: new Date(),
      },
      include: { user: true, event: true },
    });
  }

  // =============================================
  // Reject Registration (Admin Only)
  // =============================================
  async rejectRegistration(eventId: string, registrationId: string) {
    const registration = await this.prisma.eventRegistration.findFirst({
      where: { id: registrationId, eventId: eventId },
    });

    if (!registration) {
      throw new NotFoundException('Registration not found.');
    }

    if (registration.status === RegistrationStatus.REJECTED) {
      throw new BadRequestException('Registration is already rejected.');
    }

    return this.prisma.eventRegistration.update({
      where: { id: registrationId },
      data: {
        status: RegistrationStatus.REJECTED,
      },
      include: { user: true, event: true },
    });
  }


  // =============================================
  // Get Registration Columns (For Admin Approval)
  // =============================================
  async getRegistrationColumns(eventId: string) {
    const systemColumns = [
      { id: 'firstName', label: 'First Name', type: 'TEXT', isSystem: true },
      { id: 'lastName', label: 'Last Name', type: 'TEXT', isSystem: true },
      { id: 'email', label: 'Email', type: 'TEXT', isSystem: true },
      { id: 'phoneNumber', label: 'Phone Number', type: 'TEXT', isSystem: true },
      { id: 'school', label: 'School / Organization', type: 'TEXT', isSystem: true },
      { id: 'registeredAt', label: 'Registered Timestamp', type: 'DATE', isSystem: true },
    ];

    // Find PRE_EVENT form
    const form = await this.prisma.eventForm.findFirst({
      where: {
        eventId: eventId,
        type: FormType.PRE_EVENT,
      },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    });

    const formColumns = form
      ? form.fields.map((f) => ({
          id: f.id,
          label: f.question,
          type: f.fieldType,
          isSystem: false,
        }))
      : [];

    return [...systemColumns, ...formColumns];
  }

  // =============================================
  // Get Pending Registrations for Admin
  // =============================================
  async getPendingRegistrations(
    eventId: string,
    queryFields?: string[],
    queryQuestionIds?: string[],
  ) {
    const registrations = await this.prisma.eventRegistration.findMany({
      where: {
        eventId: eventId,
        status: RegistrationStatus.PENDING,
      },
      include: { user: true, session: true },
      orderBy: { registeredAt: 'asc' },
    });

    // If no specific fields requested, return standard full object (Backward Compatibility)
    if (
      (!queryFields || queryFields.length === 0) &&
      (!queryQuestionIds || queryQuestionIds.length === 0)
    ) {
      return registrations;
    }

    // Prepare for dynamic mapping
    let answersMap: Record<string, Record<string, string>> = {}; // userId -> { fieldId: answer }

    if (queryQuestionIds && queryQuestionIds.length > 0) {
      const userIds = registrations.map((r) => r.userId);
      const submissions = await this.prisma.eventFormSubmission.findMany({
        where: {
          form: {
            eventId: eventId,
            type: FormType.PRE_EVENT,
          },
          userId: { in: userIds },
        },
        include: {
          answers: true,
        },
      });

      submissions.forEach((sub) => {
        const userAnswers: Record<string, string> = {};
        sub.answers.forEach((a) => {
          if (a.answer) {
            userAnswers[a.fieldId] = a.answer;
          }
        });
        answersMap[sub.userId] = userAnswers;
      });
    }

    // Map result to flat object
    return registrations.map((reg) => {
      const row: any = {
        id: reg.id,
        userId: reg.userId,
        // Always include basic status
        status: reg.status,
      };

      // Map System Fields
      if (queryFields && queryFields.length > 0) {
        queryFields.forEach((field) => {
          if (field === 'registeredAt') {
            row[field] = reg.registeredAt;
          } else if (reg.user && field in reg.user) {
            row[field] = (reg.user as any)[field];
          }
        });
      }

      // Map Question Answers
      if (queryQuestionIds && queryQuestionIds.length > 0) {
        const userAns = answersMap[reg.userId] || {};
        queryQuestionIds.forEach((qId) => {
          row[qId] = userAns[qId] || null;
        });
      }

      return row;
    });
  }

  // =============================================
  // Get Registrations by Status
  // =============================================
  async getRegistrationsByStatus(eventId: string, status?: RegistrationStatus) {
    return this.prisma.eventRegistration.findMany({
      where: {
        eventId: eventId,
        ...(status && { status }),
      },
      include: { user: true, session: true },
      orderBy: { registeredAt: 'desc' },
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
    const isActive = this.eventRegistrationsGateway.isUserActive(userId);

    if (!isActive) {
      throw new BadRequestException('User is not active on QR Code page.');
    }

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

    // ตรวจสอบว่า registration ถูก approve แล้วหรือยัง
    if (registration.status !== RegistrationStatus.APPROVED) {
      throw new BadRequestException('Registration has not been approved yet.');
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
    const isActive = this.eventRegistrationsGateway.isUserActive(userId);

    if (!isActive) {
      throw new BadRequestException('User is not active on QR Code page.');
    }

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

  // =============================================
  // Export Registrations to Excel
  // =============================================
  async exportRegistrations(eventId: string, res: Response) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found.');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Registrations');

    // 1. Get Columns
    const columnsDef = await this.getRegistrationColumns(eventId);
    worksheet.columns = columnsDef.map((col) => ({
      header: col.label,
      key: col.id,
      width: 20,
    }));

    // 2. Format Header Row
    worksheet.getRow(1).font = { bold: true };

    // 3. Fetch Data (Fetch ALL registrations for this event to export)
    // Reuse logic from getPendingRegistrations but remove 'PENDING' filter
    // and include 'questionIds' for all dynamic columns.
    
    // Extract dynamic question IDs from columnsDef
    const questionIds = columnsDef
      .filter((c) => !c.isSystem)
      .map((c) => c.id);

    // Fetch all registrations
    const registrations = await this.prisma.eventRegistration.findMany({
      where: {
        eventId: eventId,
        // We might want to filter out 'REJECTED' or keep all?
        // Usually export implies "Participants", which are typically Approved or Pending.
        // But let's just dump everything to let user filter in Excel.
      },
      include: { user: true, session: true },
      orderBy: { registeredAt: 'asc' },
    });

    // Fetch Answers
    let answersMap: Record<string, Record<string, string>> = {};
    if (questionIds.length > 0) {
      const userIds = registrations.map((r) => r.userId);
      const submissions = await this.prisma.eventFormSubmission.findMany({
        where: {
          form: {
            eventId: eventId,
            type: FormType.PRE_EVENT,
          },
          userId: { in: userIds },
        },
        include: {
          answers: true,
        },
      });

      submissions.forEach((sub) => {
        const userAnswers: Record<string, string> = {};
        sub.answers.forEach((a) => {
          if (a.answer) {
            userAnswers[a.fieldId] = a.answer;
          }
        });
        answersMap[sub.userId] = userAnswers;
      });
    }

    // 4. Populate Rows
    registrations.forEach((reg) => {
      const row: any = {};
      
      // Map System Fields
      columnsDef.forEach((col) => {
        if (col.isSystem) {
          if (col.id === 'registeredAt') {
             row[col.id] = reg.registeredAt;
          } else if (reg.user && (col.id in reg.user)) {
             row[col.id] = (reg.user as any)[col.id];
          }
        } else {
             // Map Form Answers
             const userAns = answersMap[reg.userId] || {};
             row[col.id] = userAns[col.id] || '';
        }
      });
      
      worksheet.addRow(row);
    });

    // 5. Send Response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=registrations-${eventId}.xlsx`,
    );

    return workbook.xlsx.write(res);
  }
}