import { IsString, IsArray, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkDeleteFieldsDto {
  @ApiProperty({
    description: 'Array of field IDs to delete',
    example: ['uuid-field-1', 'uuid-field-2'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  fieldIds: string[];
}
