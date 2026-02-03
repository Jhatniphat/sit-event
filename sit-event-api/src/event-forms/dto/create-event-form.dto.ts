import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, ValidateNested, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { FormFieldType, FormType } from 'generated/prisma';

export class CreateFormFieldDto {
  @ApiProperty({
    description: 'The question text',
    example: 'How satisfied are you with the event?',
  })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({
    description: 'Type of form field',
    enum: FormFieldType,
    example: FormFieldType.RATING_SCALE,
  })
  @IsEnum(FormFieldType)
  @IsNotEmpty()
  fieldType: FormFieldType;

  @ApiPropertyOptional({
    description: 'Options for CHECKBOX and RADIO field types',
    example: ['Option 1', 'Option 2', 'Option 3'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options?: string[];

  @ApiPropertyOptional({
    description: 'Whether this field is required',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Display order of the field',
    example: 1,
    default: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}

export class CreateEventFormDto {
  @ApiProperty({
    description: 'Form title',
    example: 'Event Feedback Form',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Form description',
    example: 'Please share your feedback about the event',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Type of the form (PRE_EVENT or POST_EVENT)',
    enum: FormType,
    example: FormType.POST_EVENT,
    default: FormType.POST_EVENT
  })
  @IsEnum(FormType)
  @IsOptional()
  type?: FormType;

  @ApiPropertyOptional({
    description: 'Whether the form is active and accepting submissions',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Initial form fields to create with the form',
    type: [CreateFormFieldDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFormFieldDto)
  @IsOptional()
  fields?: CreateFormFieldDto[];
}
