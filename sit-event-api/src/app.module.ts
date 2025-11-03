import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsModule } from './events/events.module';
import { GlobalExceptionFilter } from './exceptions.filter';
import { PrismaService } from './prisma.service';

@Module({
  imports: [EventsModule],
  controllers: [AppController],
  providers: [AppService, PrismaService, { provide: 'APP_FILTER', useClass: GlobalExceptionFilter }],
})
export class AppModule {}
