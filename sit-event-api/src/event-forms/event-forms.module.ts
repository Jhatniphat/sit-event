import { Module } from '@nestjs/common';
import { EventFormsService } from './event-forms.service';
import { EventFormsController } from './event-forms.controller';
import { PrismaModule } from 'src/prisma.module';
import { UsersService } from '../users/users.service';

@Module({
  controllers: [EventFormsController],
  providers: [EventFormsService, UsersService],
  imports: [PrismaModule],
  exports: [EventFormsService],
})
export class EventFormsModule {}
