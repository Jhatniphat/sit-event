import { Module } from '@nestjs/common';
import { DashboardsService } from './dashboards.service';
import { DashboardsController } from './dashboards.controller';
import { PrismaModule } from 'src/prisma.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  controllers: [DashboardsController],
  providers: [DashboardsService],
  imports: [PrismaModule, UsersModule],
})
export class DashboardsModule {}
