import { Module } from '@nestjs/common';
import { EventRegistrationsService } from './event-registrations.service';
import { EventRegistrationsController } from './event-registrations.controller';
import { UsersModule } from 'src/users/users.module';
import { PrismaModule } from 'src/prisma.module';
import { EventRegistrationsGateway } from './event-registrations.gateway';
import { CertificatesModule } from '../certificates/certificates.module';

@Module({
  imports: [PrismaModule, UsersModule, CertificatesModule],
  controllers: [EventRegistrationsController],
  providers: [EventRegistrationsService, EventRegistrationsGateway],
})
export class EventRegistrationsModule { }
