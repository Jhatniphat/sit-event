import { FieldType } from 'generated/prisma';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCertificateElementDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  templateId: string;

  @IsNotEmpty()
  @IsString()
  fieldName: string;

  @IsNotEmpty()
  @IsEnum(FieldType)
  fieldType: FieldType;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  x: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  y: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  width?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  height?: number;

  @IsOptional()
  @IsString()
  placeHolder?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  fontSize?: number;

  @IsOptional()
  @IsString()
  fontFamily?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  fontWeight?: string;

  @IsOptional()
  @IsString()
  textAlign?: string;

  @IsOptional()
  @IsString()
  dateFormat?: string;
}