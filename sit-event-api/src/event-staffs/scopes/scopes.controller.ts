import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ScopesService } from './scopes.service';
import { UpdateStaffScopeDto } from '../dto/update-staff-scope.dto';
import { Roles, UserRole } from '../../common';

@Roles(UserRole.ADMIN)
@Controller('event-staffs')
export class ScopesController {
  constructor(private readonly scopesService: ScopesService) {}

  @Get('scopes')
  async getAllScopes(@Query('eventId') eventId?: string) {
    return this.scopesService.getAllScopes(eventId);
  }

  @Get(':staffId/scopes')
  async getStaffScopes(@Param('staffId') staffId: string) {
    return this.scopesService.getStaffScopes(staffId);
  }

  @Post(':staffId/scopes')
  async addScope(
    @Param('staffId') staffId: string,
    @Body() dto: UpdateStaffScopeDto,
  ) {
    return this.scopesService.addScope(staffId, dto);
  }

  @Delete('scopes/:scopeId')
  async removeScope(@Param('scopeId') scopeId: string) {
    return this.scopesService.removeScope(scopeId);
  }
}

