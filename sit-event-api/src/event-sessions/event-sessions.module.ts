import { Module, forwardRef } from '@nestjs/common';
import { EventSessionsService } from './event-sessions.service';
import { PrismaModule } from 'src/prisma.module';
import { EventSessionsController } from './event-sessions.controller';
import { UsersModule } from '../users/users.module';
import { ScopesModule } from '../event-staffs/scopes/scopes.module';

@Module({
  controllers: [EventSessionsController],
  providers: [EventSessionsService],
  imports: [PrismaModule, UsersModule, ScopesModule],
})
export class EventSessionsModule { }
