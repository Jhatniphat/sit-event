import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MinioClientService } from '../minio/minio-client.service';
import { CreateCertificateTemplateDto } from './dto/create-certificate-template.dto';
import { UpdateCertificateTemplateDto } from './dto/update-certificate-template.dto';
import { CreateCertificateElementDto } from './dto/create-certificate-element.dto';
import { UpdateCertificateElementDto } from './dto/update-certificate-element.dto';
import { FieldType } from 'generated/prisma';
import { createCanvas, loadImage } from 'canvas';
import { PreviewCertificateDto } from './dto/preview-certificate.dto';
@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioClient: MinioClientService,
  ) {}

  // ================= Template Methods =================

  async createTemplate(
    dto: CreateCertificateTemplateDto,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Background image file is required');
    }

    const uploadResult = await this.minioClient.uploadFile(file);

    return this.prisma.certificateTemplate.create({
      data: {
        eventId: dto.eventId,
        templateFilepath: uploadResult.fileName,
      },
    });
  }

  async findAllTemplates(eventId?: string) {
    const where = eventId ? { eventId } : {};
    const templates = await this.prisma.certificateTemplate.findMany({
      where,
      include: { elements: true },
    });

    // Map URL for frontend logic
    return Promise.all(
      templates.map(async (t) => ({
        ...t,
        templateUrl: await this.minioClient.getPresignedUrl(t.templateFilepath),
      })),
    );
  }

  async findOneTemplate(id: string) {
    const template = await this.prisma.certificateTemplate.findUnique({
      where: { id },
      include: { elements: true },
    });

    if (!template) throw new NotFoundException('Template not found');

    return {
      ...template,
      templateUrl: await this.minioClient.getPresignedUrl(
        template.templateFilepath,
      ),
    };
  }

  async updateTemplate(
    id: string,
    dto: UpdateCertificateTemplateDto,
    file?: Express.Multer.File,
  ) {
    const template = await this.prisma.certificateTemplate.findUnique({
      where: { id },
    });
    if (!template) throw new NotFoundException('Template not found');

    let newFilename = template.templateFilepath;

    if (file) {
      // 1. Delete old file
      await this.minioClient.deleteFile(template.templateFilepath);
      // 2. Upload new file
      const uploadResult = await this.minioClient.uploadFile(file);
      newFilename = uploadResult.fileName;
    }

    return this.prisma.certificateTemplate.update({
      where: { id },
      data: {
        ...dto,
        templateFilepath: newFilename,
      },
    });
  }

  async removeTemplate(id: string) {
    const template = await this.prisma.certificateTemplate.findUnique({
      where: { id },
      include: { elements: true },
    });
    if (!template) throw new NotFoundException('Template not found');

    // Delete background file
    await this.minioClient.deleteFile(template.templateFilepath);

    // Delete element files (if any are images)
    for (const element of template.elements) {
      if (element.sourceFilepath) {
        await this.minioClient.deleteFile(element.sourceFilepath);
      }
    }

    return this.prisma.certificateTemplate.delete({ where: { id } });
  }

  // ================= Element Methods =================

  async createElement(
    dto: CreateCertificateElementDto,
    file?: Express.Multer.File,
  ) {
    let sourceFilepath: string | null = null;

    if (dto.fieldType === FieldType.Image) {
      if (!file) {
        throw new BadRequestException('File is required for Image field type');
      }
      const uploadResult = await this.minioClient.uploadFile(file);
      sourceFilepath = uploadResult.fileName;
    }

    return this.prisma.certificateElement.create({
      data: {
        ...dto,
        sourceFilepath,
      },
    });
  }

  async findAllElements(templateId: string) {
    const elements = await this.prisma.certificateElement.findMany({
      where: { templateId },
    });

    return Promise.all(
      elements.map(async (e) => ({
        ...e,
        sourceUrl: e.sourceFilepath
          ? await this.minioClient.getPresignedUrl(e.sourceFilepath)
          : null,
      })),
    );
  }

  async findOneElement(id: string) {
    const element = await this.prisma.certificateElement.findUnique({
      where: { id },
    });
    if (!element) throw new NotFoundException('Element not found');

    return {
      ...element,
      sourceUrl: element.sourceFilepath
        ? await this.minioClient.getPresignedUrl(element.sourceFilepath)
        : null,
    };
  }

  async updateElement(
    id: string,
    dto: UpdateCertificateElementDto,
    file?: Express.Multer.File,
  ) {
    const element = await this.prisma.certificateElement.findUnique({
      where: { id },
    });
    if (!element) throw new NotFoundException('Element not found');

    let newSourceFilepath = element.sourceFilepath;

    if (file) {
      if (element.sourceFilepath) {
        await this.minioClient.deleteFile(element.sourceFilepath);
      }
      const uploadResult = await this.minioClient.uploadFile(file);
      newSourceFilepath = uploadResult.fileName;
    }

    return this.prisma.certificateElement.update({
      where: { id },
      data: {
        ...dto,
        sourceFilepath: newSourceFilepath,
      },
    });
  }

  async removeElement(id: string) {
    const element = await this.prisma.certificateElement.findUnique({
      where: { id },
    });
    if (!element) throw new NotFoundException('Element not found');

    if (element.sourceFilepath) {
      await this.minioClient.deleteFile(element.sourceFilepath);
    }

    return this.prisma.certificateElement.delete({ where: { id } });
  }

  async generatePreview(dto: PreviewCertificateDto): Promise<Buffer> {
    // 1. ดึงข้อมูล Template เพื่อเอา path รูป Background
    const template = await this.prisma.certificateTemplate.findUnique({
      where: { id: dto.templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // 2. โหลดรูป Background จาก MinIO มาเป็น Buffer
    const bgBuffer = await this.minioClient.getFile(template.templateFilepath);
    
    // 3. สร้าง Canvas
    const image = await loadImage(bgBuffer);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    // วาด Background
    ctx.drawImage(image, 0, 0);

    // 4. วาด Elements ตามที่ส่งมา
    for (const el of dto.elements) {
      // Mock Data ตาม FieldType
      let text = '';
      const isImage = el.fieldType === FieldType.Image;

      switch (el.fieldType) {
        case FieldType.ParticipantName:
          text = 'นายสมชาย รักเรียน'; // Mock ชื่อไทย
          break;
        case FieldType.EventName:
          text = 'กิจกรรมเปิดโลกไอที 2026';
          break;
        case FieldType.EventStartDate:
        case FieldType.EventEndDate:
        case FieldType.Date:
          // ลอง Format วันที่แบบไทย
          text = '25 มกราคม 2569';
          break;
        case FieldType.SerialNumber:
          text = 'SIT-2026-0001';
          break;
        case FieldType.Text:
          text = el.placeHolder || 'ข้อความตัวอย่าง';
          break;
        case FieldType.Image:
          // กรณีเป็นรูปภาพ (เช่น ลายเซ็น) จะวาดกรอบสี่เหลี่ยมจำลองแทน
          break;
      }

      // การตั้งค่า Font และ Drawing
      if (isImage) {
        // วาดกรอบสมมติสำหรับรูปภาพ
        ctx.strokeStyle = '#FF0000'; // สีแดง
        ctx.lineWidth = 2;
        ctx.strokeRect(el.x, el.y, el.width || 100, el.height || 50);
        
        // เขียนบอกว่าเป็นรูป
        ctx.font = '16px Arial';
        ctx.fillStyle = '#FF0000';
        ctx.fillText('Image/Signature', el.x + 5, el.y + 20);
      } else {
        // วาดข้อความ
        // หมายเหตุ: Font ควรเป็น Font ที่รองรับภาษาไทยในเครื่อง Server
        // ถ้าไม่มี Font อาจจะเป็นสี่เหลี่ยมได้
        const fontSize = el.fontSize || 20;
        const fontFamily = el.fontFamily || 'Arial'; // หรือ 'Sarabun', 'Tahoma'
        const fontWeight = el.fontWeight || 'normal';
        
        ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}"`;
        ctx.fillStyle = el.color || '#000000';
        ctx.textAlign = (el.textAlign as CanvasTextAlign) || 'left';
        ctx.textBaseline = 'top'; // *** สำคัญ: ให้ x,y เริ่มจากมุมซ้ายบน ***

        ctx.fillText(text, el.x, el.y);
      }
    }

    // Return เป็น Buffer (image/png)
    return canvas.toBuffer('image/png');
  }
}