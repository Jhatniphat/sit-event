import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FormAnswerDto {
  @ApiProperty({
    description: 'The field ID to answer',
    example: 'uuid-field-id',
  })
  @IsString()
  @IsNotEmpty()
  fieldId: string;

  @ApiPropertyOptional({
    description: 'The answer value (text, number, or selected option)',
    example: '5',
  })
  @IsString()
  @IsOptional()
  answer?: string;
}

export class SubmitFormDto {
  @ApiProperty({
    description: 'Array of answers for each form field',
    type: [FormAnswerDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormAnswerDto)
  @IsNotEmpty()
  answers: FormAnswerDto[];
}
