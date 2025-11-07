import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  IsUrl,
  IsUUID
} from 'class-validator';
import { TargetAudience, EventTag } from 'generated/prisma';
export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @IsString({ each: true })
  images: string[];

  @IsString()
  @IsNotEmpty()
  thumbnail: string;

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
  targetAudience: TargetAudience[];

  @IsArray()
  @IsEnum(EventTag, { each: true })
  @IsNotEmpty()
  tags: EventTag[];

  @IsBoolean()
  @IsOptional()
  allowOnSiteRegister: boolean;

  @IsInt()
  @IsOptional()
  activityHours?: number;

  @IsString()
  @IsOptional()
  invitation?: string;

  @IsUrl()
  @IsOptional()
  website?: string;

  @IsBoolean()
  @IsOptional()
  needWifi?: boolean;

  @IsString()
  @IsOptional()
  certificateCriteria?: string;
}
