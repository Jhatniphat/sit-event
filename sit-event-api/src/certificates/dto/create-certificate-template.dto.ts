import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateCertificateTemplateDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  eventId: string;
}