import { Module } from '@nestjs/common';
import { EventFormsService } from './event-forms.service';
import { EventFormsController } from './event-forms.controller';
import { FormsController } from './forms.controller';
import { PrismaModule } from 'src/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
  controllers: [EventFormsController, FormsController],
  providers: [EventFormsService],
  imports: [PrismaModule, UsersModule],
  exports: [EventFormsService],
})
export class EventFormsModule { }
