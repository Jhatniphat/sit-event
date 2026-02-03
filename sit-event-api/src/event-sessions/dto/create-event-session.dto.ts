import { IsString, IsNotEmpty, IsDateString, IsInt, Min, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventSessionDto {
  @ApiProperty({
    description: 'Session name',
    example: 'Opening Ceremony',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Session description',
    example: 'Opening ceremony for the event',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Session start time in ISO 8601 format',
    example: '2025-12-26T09:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({
    description: 'Session end time in ISO 8601 format',
    example: '2025-12-26T12:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @ApiPropertyOptional({
    description: 'Session location',
    example: 'Main Hall, Building A',
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    description: 'Maximum number of seats available',
    example: 100,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  maxSeats: number;

  @ApiPropertyOptional({
    description: 'Whether to automatically register participants for this session when they register for the event',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  autoRegister?: boolean;

  @ApiPropertyOptional({
    description: 'Points awarded for attending this session',
    example: 10,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  pointsAwarded?: number;
}
