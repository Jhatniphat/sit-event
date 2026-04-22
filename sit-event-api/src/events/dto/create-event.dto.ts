import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  IsEnum,
  IsUrl,
  IsUUID
} from 'class-validator';
import { TargetAudience, EventTag } from 'generated/prisma';
import { Transform, Type } from 'class-transformer';
export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    // If no value is provided, return empty array
    if (!value || value === '' || value === 'undefined') return [];
    // If it's already an array, return it
    if (Array.isArray(value)) return value;
    // If it's a string, wrap it in an array
    if (typeof value === 'string') return [value];
    // Otherwise return empty array
    return [];
  })
  images?: string[];

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsDateString()
  registrationOpenDate: string;

  @IsDateString()
  registrationEndDate: string;

  @IsDateString()
  eventStartDate: string;

  @IsDateString()
  eventEndDate: string;

  @IsArray()
  @IsEnum(TargetAudience, { each: true })
  @IsNotEmpty()
  @Transform(({ value }) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  })
  targetAudience: TargetAudience[];

  @IsArray()
  @IsEnum(EventTag, { each: true })
  @IsNotEmpty()
  @Transform(({ value }) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  })
  tags: EventTag[];

  @IsBoolean()
  @IsOptional()
  allowOnSiteRegister: boolean;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  activityHours?: number;

  @IsString()
  @IsOptional()
  invitation?: string;

  @IsUrl()
  @IsOptional()
  website?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  needWifi?: boolean;

  @IsString()
  @IsOptional()
  certificateCriteria?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  maxSeats?: number;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (!value) return [];
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return [];
      }
    }
    return value;
  })
  sessions?: any[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (!value) return [];
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return [];
      }
    }
    return value;
  })
  forms?: any[];

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  enableReserve?: boolean;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  maxReserveSeats?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  requireApprove?: boolean;
}
