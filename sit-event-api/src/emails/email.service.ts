import { Injectable, BadRequestException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { SendEmailDto, EmailTemplate } from './dto/send-email.dto';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) { }

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
   * แจ้งอนุมัติเข้าร่วม Event
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
   * แจ้งปฏิเสธการเข้าร่วม
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
}