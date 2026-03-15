import { Controller, Get, Param } from '@nestjs/common';
import { DashboardsService } from './dashboards.service';
import { AdminOnly } from 'src/common';

@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Get('events/:eventId/stats')
  @AdminOnly()
  getEventStats(@Param('eventId') eventId: string) {
    return this.dashboardsService.getEventStats(eventId);
  }
}
