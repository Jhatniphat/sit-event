import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CronService } from './cron.service';
import { PrismaService } from '../prisma.service';
import { EmailModule } from '../emails/email.module';
import { CertificatesModule } from '../certificates/certificates.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EmailModule,
    CertificatesModule
  ],
  providers: [CronService, PrismaService],
})
export class CronModule {}
