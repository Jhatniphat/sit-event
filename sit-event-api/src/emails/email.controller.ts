import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { SendEmailDto } from './dto/send-email.dto';
import { AdminOnly } from '../common/decorators/roles.decorator';

@ApiTags('Email')
@Controller('emails')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @AdminOnly()
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'ส่งอีเมล (Admin only)', 
    description: 'ส่งอีเมลแบบ manual โดย Admin สามารถใช้ template หรือ html/text ได้' 
  })
  @ApiResponse({ status: 200, description: 'ส่งอีเมลสำเร็จ' })
  @ApiResponse({ status: 400, description: 'ข้อมูลไม่ถูกต้อง' })
  @ApiResponse({ status: 401, description: 'ไม่ได้ Login' })
  @ApiResponse({ status: 403, description: 'ไม่มีสิทธิ์ (ต้องเป็น Admin)' })
  async sendEmail(@Body() dto: SendEmailDto) {
    return this.emailService.sendEmail(dto);
  }
}