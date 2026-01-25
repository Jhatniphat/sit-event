import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CertificatesService } from './certificates.service';
import { CreateCertificateTemplateDto } from './dto/create-certificate-template.dto';
import { UpdateCertificateTemplateDto } from './dto/update-certificate-template.dto';
import { CreateCertificateElementDto } from './dto/create-certificate-element.dto';
import { UpdateCertificateElementDto } from './dto/update-certificate-element.dto';
import { Res, Header } from '@nestjs/common';
import { Response } from 'express';
import { PreviewCertificateDto } from './dto/preview-certificate.dto';

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  // ================= Template Endpoints =================

  @Post('templates')
  @UseInterceptors(FileInterceptor('file'))
  createTemplate(
    @Body() createTemplateDto: CreateCertificateTemplateDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.certificatesService.createTemplate(createTemplateDto, file);
  }

  @Get('templates')
  findAllTemplates(@Query('eventId') eventId?: string) {
    return this.certificatesService.findAllTemplates(eventId);
  }

  @Get('templates/:id')
  findOneTemplate(@Param('id') id: string) {
    return this.certificatesService.findOneTemplate(id);
  }

  @Patch('templates/:id')
  @UseInterceptors(FileInterceptor('file'))
  updateTemplate(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateCertificateTemplateDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.certificatesService.updateTemplate(id, updateTemplateDto, file);
  }

  @Delete('templates/:id')
  removeTemplate(@Param('id') id: string) {
    return this.certificatesService.removeTemplate(id);
  }

  // ================= Element Endpoints =================

  @Post('elements')
  @UseInterceptors(FileInterceptor('file'))
  createElement(
    @Body() createElementDto: CreateCertificateElementDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.certificatesService.createElement(createElementDto, file);
  }

  @Get('templates/:templateId/elements')
  findAllElements(@Param('templateId') templateId: string) {
    return this.certificatesService.findAllElements(templateId);
  }

  @Get('elements/:id')
  findOneElement(@Param('id') id: string) {
    return this.certificatesService.findOneElement(id);
  }

  @Patch('elements/:id')
  @UseInterceptors(FileInterceptor('file'))
  updateElement(
    @Param('id') id: string,
    @Body() updateElementDto: UpdateCertificateElementDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.certificatesService.updateElement(id, updateElementDto, file);
  }

  @Delete('elements/:id')
  removeElement(@Param('id') id: string) {
    return this.certificatesService.removeElement(id);
  }

  @Post('preview')
  @Header('Content-Type', 'image/png')
  async previewCertificate(
    @Body() dto: PreviewCertificateDto,
    @Res() res: Response,
  ) {
    const imageBuffer = await this.certificatesService.generatePreview(dto);
    
    // ส่ง Stream กลับไปที่ Frontend โดยตรง
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': imageBuffer.length,
    });
    res.send(imageBuffer);
  }
}