import { IsString, IsNotEmpty, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FieldOrderDto {
  @ApiProperty({
    description: 'Field ID',
    example: 'uuid-field-id',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'New order position',
    example: 1,
  })
  @IsInt()
  @Min(0)
  order: number;
}

export class ReorderFieldsDto {
  @ApiProperty({
    description: 'Array of field IDs with their new order',
    type: [FieldOrderDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldOrderDto)
  @IsNotEmpty()
  fields: FieldOrderDto[];
}
