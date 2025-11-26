import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PrismaModule } from 'src/prisma.module';
import { UsersModule } from '../users/users.module';
import { MinioClientModule } from '../minio/minio.module';

@Module({
  imports: [PrismaModule, UsersModule, MinioClientModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
