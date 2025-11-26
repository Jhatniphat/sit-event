import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { MinioService } from 'nestjs-minio-client';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class MinioClientService {
  private readonly logger = new Logger(MinioClientService.name);
  private readonly bucketName: string;

  constructor(
    private readonly minio: MinioService,
    private readonly configService: ConfigService,
  ) {
    this.bucketName = this.configService.get('MINIO_BUCKET_NAME')!;
  }

  private getFileNameFromUrl(urlOrName: string): string {
    if (!urlOrName) return '';
    // ถ้ามี http หรือ / แสดงว่าเป็น URL ให้ตัดเอาตัวสุดท้าย
    if (urlOrName.includes('http') || urlOrName.includes('/')) {
        const segments = urlOrName.split('/');
        let fileName = segments[segments.length - 1];
        // Remove query parameters if they exist (for presigned URLs)
        if (fileName.includes('?')) {
          fileName = fileName.split('?')[0];
        }
        return fileName;
    }
    return urlOrName;
  }

  public async uploadFile(file: Express.Multer.File) {
    // 1. สร้างชื่อไฟล์ใหม่ (Hash) เพื่อป้องกันชื่อซ้ำและตัวอักษรแปลกๆ
    const tempFilename = Date.now().toString();
    const hashedFileName = crypto.createHash('md5').update(tempFilename).digest("hex");
    const ext = file.originalname.substring(file.originalname.lastIndexOf('.'), file.originalname.length);
    const fileName = hashedFileName + ext;

    // 2. Upload ไฟล์เข้า MinIO Bucket
    try {
      await this.minio.client.putObject(this.bucketName, fileName, file.buffer, file.size, {
        'Content-Type': file.mimetype,
      });
    } catch (err) {
      this.logger.error(err);
      throw new HttpException('Error uploading file to MinIO', HttpStatus.BAD_REQUEST);
    }

    // 3. สร้าง URL สำหรับ return กลับไปบันทึกใน DB
    const protocol = this.configService.get('MINIO_USE_SSL') === 'true' ? 'https' : 'http';
    const host = this.configService.get('MINIO_ENDPOINT');
    const port = this.configService.get('MINIO_PORT');
    
    // ผลลัพธ์จะเป็น http://localhost:9000/sit-events-bucket/ชื่อไฟล์.jpg
    const url = `${protocol}://${host}:${port}/${this.bucketName}/${fileName}`;

    return {
      fileName: fileName 
    };
  }

  public async getPresignedUrl(fileNameOrUrl: string): Promise<string> {
    // กำหนดอายุของ Link (เช่น 1 วัน = 24*60*60 วินาที)
    const fileName = this.getFileNameFromUrl(fileNameOrUrl);
    const expiry = 24 * 60 * 60; 
    try {
      return await this.minio.client.presignedGetObject(this.bucketName, fileName, expiry);
    } catch (error) {
      this.logger.error(`Could not generate presigned URL for: ${fileName}`, error);
      return ''; // กรณีหาไม่เจอหรือ Error ให้ส่ง string ว่าง หรือ URL รูป placeholder แทน
    }
  }

  public async deleteFile(fileNameOrUrl: string) {
    const fileName = this.getFileNameFromUrl(fileNameOrUrl);
    try {
      await this.minio.client.removeObject(this.bucketName, fileName);
    } catch (err) {
      this.logger.error(`Could not delete file: ${fileName}`, err);
    }
  }
}