import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsUUID, ValidateNested } from 'class-validator';
import { CreateCertificateElementDto } from './create-certificate-element.dto';

export class PreviewCertificateDto {
  @IsNotEmpty()
  @IsUUID()
  templateId: string; // เพื่อดึงรูป Background

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCertificateElementDto)
  elements: CreateCertificateElementDto[]; // ส่ง Element ที่ต้องการลอง Preview มา
}