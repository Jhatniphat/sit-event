import { Module } from '@nestjs/common';
import { EventSessionsService } from './event-sessions.service';
import { PrismaModule } from 'src/prisma.module';
import { EventSessionsController } from './event-sessions.controller';
import { UsersService } from '../users/users.service';

@Module({
  controllers: [EventSessionsController],
  providers: [EventSessionsService, UsersService],
  imports: [PrismaModule],
})
export class EventSessionsModule {}
