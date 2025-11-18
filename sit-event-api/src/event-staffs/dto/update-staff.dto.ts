import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StaffStatus } from 'generated/prisma';

export class UpdateStaffDto {
  @IsOptional()
  @IsEnum(StaffStatus)
  status?: StaffStatus;

  @IsOptional()
  @IsString()
  eventRole?: string;
}