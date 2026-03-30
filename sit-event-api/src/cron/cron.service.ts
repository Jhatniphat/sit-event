import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../emails/email.service';
import { CertificatesService } from '../certificates/certificates.service';
import { FormType } from 'generated/prisma';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly certificatesService: CertificatesService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handlePostEventLogic() {
    this.logger.debug('Running handlePostEventLogic cron job');

    const now = new Date();

    try {
      // ค้นหางานที่เพิ่งจบ และยังไม่ได้จัดการส่งอีเมลหลังจบงาน
      const events = await this.prisma.event.findMany({
        where: {
          eventEndDate: { lte: now },
          postEventEmailSent: false,
        },
        include: {
          certificated: true,
          forms: {
            where: { type: FormType.POST_EVENT, isActive: true },
          },
          registrations: {
            where: { attended: true }, // เฉพาะคนที่เข้าร่วม
            include: {
              user: true,
            },
          },
        },
      });

      for (const event of events) {
        const hasCertificate = event.certificated.length > 0;
        const hasPostEventForm = event.forms.length > 0;
        const participantCount = event.registrations.length;

        this.logger.log(
          `Processing event ${event.name} (${event.id}) - Cert: ${hasCertificate}, Form: ${hasPostEventForm}, Participants: ${participantCount}`,
        );

        if (participantCount > 0) {
          if (!hasCertificate && !hasPostEventForm) {
            // เมื่อ event จบ แล้วไม่มีทั้ง certificate และ form post-event ไม่ต้องทำอะไร
            this.logger.log(`No certificate and no form for event ${event.name}. Skipping emails.`);
          } else if (hasCertificate && !hasPostEventForm) {
            // เมื่อ event จบ หากมี certificate แต่ไม่มีฟอร์ม ให้ export certificate และส่งไปทางอีเมล
            this.logger.log(`Has certificate but no form for event ${event.name}. Issuing certificates to attendees.`);
            
            for (const registration of event.registrations) {
              await this.certificatesService.issueCertificate(event.id, registration.userId);
            }
          } else if (hasCertificate && hasPostEventForm) {
            // เมื่อ event จบ หากมี certificate และมีฟอร์ม ให้ส่งฟอร์มไปทางอีเมล
            this.logger.log(`Has certificate and form for event ${event.name}. Sending form link to attendees.`);
            
            this.sendFormsToParticipants(event);
          } else if (!hasCertificate && hasPostEventForm) {
            this.logger.log(`Has no certificate but has form for event ${event.name}. Sending form link to attendees.`);
            
            this.sendFormsToParticipants(event);
          }
        }

        // Mark as processed
        await this.prisma.event.update({
          where: { id: event.id },
          data: { postEventEmailSent: true },
        });
        this.logger.log(`Event ${event.name} marked as postEventEmailSent = true.`);
      }
    } catch (error) {
      this.logger.error(`Error processing post-event logic:`, error);
    }
  }

  private async sendFormsToParticipants(event: any) {
    const frontendUrl = process.env.CORS_ALLOWED_ORIGINS 
      ? process.env.CORS_ALLOWED_ORIGINS.split(',')[0] 
      : 'http://localhost:5173';
      
    // URL สำหรับให้ผู้ใช้เข้าไปกรอกฟอร์มหลังจบงาน
    const formUrl = `${frontendUrl}/events/${event.id}/forms`;

    for (const registration of event.registrations) {
      if (!registration.user?.email) continue;
      
      try {
        await this.emailService.sendFormLink(
          registration.user.email,
          event.name,
          formUrl,
        );
      } catch (err) {
        this.logger.error(`Failed to send form link to ${registration.user.email} for event ${event.name}:`, err);
      }
    }
  }
}
