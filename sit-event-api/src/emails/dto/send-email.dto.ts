import { IsString, IsEmail, IsArray, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EmailTemplate {
  APPROVAL = 'approval',
  REJECTION = 'rejection',
  FORM_LINK = 'form-link',
  CERTIFICATE = 'certificate',
  CUSTOM = 'custom',
}

class AttachmentDto {
  @ApiProperty({ description: 'ชื่อไฟล์แนบ', example: 'certificate.pdf' })
  @IsString()
  filename!: string;

  @ApiProperty({ description: 'Path หรือ URL ของไฟล์', example: '/uploads/cert.pdf' })
  @IsString()
  path!: string;
}

export class SendEmailDto {
  @ApiProperty({ 
    description: 'อีเมลผู้รับ (รับได้หลายคน)', 
    example: ['user1@example.com', 'user2@example.com'],
    type: [String]
  })
  @IsArray()
  @IsEmail({}, { each: true })
  to!: string[];

  @ApiProperty({ description: 'หัวข้ออีเมล', example: 'แจ้งผลการสมัครเข้าร่วม Event' })
  @IsString()
  subject!: string;

  @ApiPropertyOptional({ 
    description: 'ชื่อ Template ที่จะใช้', 
    enum: EmailTemplate,
    example: EmailTemplate.APPROVAL 
  })
  @IsOptional()
  @IsEnum(EmailTemplate)
  template?: EmailTemplate;

  @ApiPropertyOptional({ 
    description: 'ข้อมูลสำหรับใส่ใน Template', 
    example: { participantName: 'สมชาย', eventName: 'Tech Conference' } 
  })
  @IsOptional()
  context?: Record<string, any>;

  @ApiPropertyOptional({ 
    description: 'เนื้อหา HTML (ใช้แทน template)', 
    example: '<h1>สวัสดี</h1><p>ขอบคุณที่สมัคร</p>' 
  })
  @IsOptional()
  @IsString()
  html?: string;

  @ApiPropertyOptional({ 
    description: 'เนื้อหาข้อความธรรมดา', 
    example: 'สวัสดี ขอบคุณที่สมัคร' 
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ 
    description: 'ไฟล์แนบ', 
    type: [AttachmentDto] 
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
