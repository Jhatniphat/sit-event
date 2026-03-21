import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StaffPermissionType } from 'generated/prisma';

export class UpdateStaffScopeDto {
  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsEnum(StaffPermissionType)
  permission!: StaffPermissionType;
}
