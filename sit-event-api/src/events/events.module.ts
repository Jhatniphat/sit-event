import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PrismaModule } from 'src/prisma.module';
import { UsersModule } from '../users/users.module';
import { MinioClientModule } from '../minio/minio.module';
import { ScopesModule } from '../event-staffs/scopes/scopes.module';
import { EventSessionsModule } from '../event-sessions/event-sessions.module';

@Module({
  imports: [PrismaModule, UsersModule, MinioClientModule, ScopesModule, EventSessionsModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
