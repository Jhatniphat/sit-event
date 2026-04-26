import { Injectable, BadRequestException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import * as QRCode from 'qrcode';
import { SendEmailDto, EmailTemplate } from './dto/send-email.dto';
import { RegistrationStatus } from '../../generated/prisma';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) { }

  async generateQRCode(userId: string, eventId: string): Promise<Buffer> {
    if (!userId || !eventId) {
      throw new BadRequestException('ต้องระบุ userId และ eventId');
    }

    const payload = `${userId}:${eventId}`;
    return QRCode.toBuffer(payload, { type: 'png', errorCorrectionLevel: 'M' });
  }

  async sendEmail(dto: SendEmailDto): Promise<{ success: boolean; message: string }> {
    const { to, subject, template, context, html, text, attachments } = dto;

    // ต้องมี template หรือ html/text อย่างใดอย่างหนึ่ง
    if (!template && !html && !text) {
      throw new BadRequestException('ต้องระบุ template, html หรือ text อย่างน้อย 1 อย่าง');
    }

    try {
      const mailOptions: any = {
        to: to.join(', '),
        subject,
      };

      // ใช้ template ถ้ามี
      if (template && template !== EmailTemplate.CUSTOM) {
        mailOptions.template = template;
        mailOptions.context = context || {};
      } else {
        // ใช้ html/text แทน
        if (html) mailOptions.html = html;
        if (text) mailOptions.text = text;
      }

      // เพิ่ม attachments ถ้ามี
      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments;
      }

      await this.mailerService.sendMail(mailOptions);

      return {
        success: true,
        message: `ส่งอีเมลไปยัง ${to.length} คนสำเร็จ`,
      };
    } catch (error: any) {
      throw new BadRequestException(`ส่งอีเมลไม่สำเร็จ: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * ส่งลิงก์ฟอร์มให้ผู้เข้าร่วม
   */
  async sendFormLink(
    email: string,
    eventName: string,
    formUrl: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: `กรุณากรอกแบบฟอร์ม - ${eventName}`,
      template: 'form-link',
      context: { eventName, formUrl },
    });
  }

  /**
   * ส่ง Certificate
   */
  async sendCertificate(
    email: string,
    participantName: string,
    eventName: string,
    certificateBuffer: Buffer,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: `ใบประกาศนียบัตร - ${eventName}`,
      template: 'certificate',
      context: { participantName, eventName },
      attachments: [
        {
          filename: 'certificate.png',
          content: certificateBuffer,
        },
      ],
    });
  }

  /**
   * แจ้งอนุมัติเข้าร่วม Event (legacy — kept for compatibility)
   */
  async sendApprovalNotification(
    email: string,
    participantName: string,
    eventName: string,
    eventDate: string,
    eventLocation: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: `อนุมัติเข้าร่วม: ${eventName}`,
      template: 'approval',
      context: { participantName, eventName, eventDate, eventLocation },
    });
  }

  /**
   * แจ้งปฏิเสธการเข้าร่วม (legacy — kept for compatibility)
   */
  async sendRejectionNotification(
    email: string,
    participantName: string,
    eventName: string,
    reason?: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: `ผลการสมัคร: ${eventName}`,
      template: 'rejection',
      context: { participantName, eventName, reason },
    });
  }

  // ---------------------------------------------------------------------------
  // Registration notification: handles all statuses (new unified method)
  // ---------------------------------------------------------------------------

  /**
   * ส่งอีเมลแจ้งผลการลงทะเบียน/อัปเดตสถานะ
   *
   * @param status  RegistrationStatus ที่ต้องการแจ้ง
   * @param email   อีเมลผู้รับ
   * @param context ข้อมูลที่ใช้ใน template
   * @param userId  ใช้สำหรับ generate QR Code เมื่อ status = APPROVED
   * @param eventId ใช้สำหรับ generate QR Code เมื่อ status = APPROVED
   */
  async sendRegistrationEmail(params: {
    status: RegistrationStatus;
    email: string;
    participantName: string;
    eventName: string;
    eventId: string;
    userId: string;
    eventStartDate: string;
    eventEndDate?: string;
    eventLocation?: string;
    sessions?: Array<{ name: string; time?: string }>;
    reason?: string;
  }): Promise<void> {
    const {
      status,
      email,
      participantName,
      eventName,
      eventId,
      userId,
      eventStartDate,
      eventEndDate,
      eventLocation,
      sessions,
      reason,
    } = params;

    const baseContext = {
      participantName,
      eventName,
      eventStartDate,
      eventEndDate,
      eventLocation,
      sessions,
    };

    switch (status) {
      case RegistrationStatus.PENDING: {
        await this.mailerService.sendMail({
          to: email,
          subject: `ลงทะเบียนสำเร็จ (รอการอนุมัติ) - ${eventName}`,
          template: 'registration-pending',
          context: baseContext,
        });
        break;
      }

      case RegistrationStatus.APPROVED: {
        // Generate QR Code as inline attachment
        const qrBuffer = await this.generateQRCode(userId, eventId);
        await this.mailerService.sendMail({
          to: email,
          subject: `ได้รับการอนุมัติ - ${eventName}`,
          template: 'registration-approved',
          context: baseContext,
          attachments: [
            {
              filename: 'qr_code.png',
              content: qrBuffer,
              cid: 'qr_code', // referenced as cid:qr_code in template
            },
          ],
        });
        break;
      }

      case RegistrationStatus.RESERVED: {
        await this.mailerService.sendMail({
          to: email,
          subject: `อยู่ในรายชื่อสำรอง - ${eventName}`,
          template: 'registration-reserved',
          context: baseContext,
        });
        break;
      }

      case RegistrationStatus.REJECTED: {
        await this.mailerService.sendMail({
          to: email,
          subject: `ผลการพิจารณาการสมัคร - ${eventName}`,
          template: 'registration-rejected',
          context: { ...baseContext, reason },
        });
        break;
      }

      default:
        // ไม่ส่งอีเมลสำหรับสถานะอื่น ๆ
        break;
    }
  }
}