import { PartialType } from '@nestjs/mapped-types';
import { CreateCertificateElementDto } from './create-certificate-element.dto';

export class UpdateCertificateElementDto extends PartialType(CreateCertificateElementDto) {}