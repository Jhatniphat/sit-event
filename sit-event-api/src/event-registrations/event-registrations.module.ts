import { Module } from '@nestjs/common';
import { EventRegistrationsService } from './event-registrations.service';
import { EventRegistrationsController } from './event-registrations.controller';
import { UsersModule } from 'src/users/users.module';
import { PrismaModule } from 'src/prisma.module';
import { EventRegistrationsGateway } from './event-registrations.gateway';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [EventRegistrationsController],
  providers: [EventRegistrationsService, EventRegistrationsGateway],
})
export class EventRegistrationsModule {}
