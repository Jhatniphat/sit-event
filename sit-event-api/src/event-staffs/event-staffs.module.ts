import { Module } from '@nestjs/common';
import { EventStaffsService } from './event-staffs.service';
import { EventStaffsController } from './event-staffs.controller';
import { PrismaModule } from 'src/prisma.module';
import { UsersModule } from 'src/users/users.module';
import { EventsModule } from 'src/events/events.module';
import { ScopesModule } from './scopes/scopes.module';

@Module({
  imports: [PrismaModule, UsersModule, EventsModule, ScopesModule],
  controllers: [EventStaffsController],
  providers: [EventStaffsService],
})
export class EventStaffsModule {}
