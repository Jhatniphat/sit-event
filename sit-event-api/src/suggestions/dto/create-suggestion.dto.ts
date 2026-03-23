import { IsString, IsOptional, IsEnum, IsArray, IsDate, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { BackgroundType, AnnouncementType } from 'generated/prisma';

export class CreateSuggestionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  link?: string;

  @IsString()
  @IsOptional()
  eventId?: string;

  @IsEnum(BackgroundType)
  @IsOptional()
  backgroundType?: BackgroundType;

  @IsString()
  @IsOptional()
  backgroundImage?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  icons?: string[];

  @IsEnum(AnnouncementType)
  @IsOptional()
  announcementType?: AnnouncementType;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  contentDate?: Date;
}
