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

  public async uploadFile(file: Express.Multer.File, retries = 3) {
    this.logger.log(`Starting file upload: ${file?.originalname}`);
    this.logger.log(`File details - size: ${file?.size}, mimetype: ${file?.mimetype}, buffer: ${file?.buffer ? 'exists' : 'missing'}`);
    
    if (!file) {
      this.logger.error('File object is undefined or null');
      throw new HttpException('File is required', HttpStatus.BAD_REQUEST);
    }
    
    if (!file.buffer) {
      this.logger.error('File buffer is missing');
      throw new HttpException('File buffer is missing', HttpStatus.BAD_REQUEST);
    }
    
    // 1. สร้างชื่อไฟล์ใหม่ (Hash) เพื่อป้องกันชื่อซ้ำและตัวอักษรแปลกๆ
    const tempFilename = Date.now().toString() + Math.random().toString();
    const hashedFileName = crypto.createHash('md5').update(tempFilename).digest("hex");
    const ext = file.originalname.substring(file.originalname.lastIndexOf('.'), file.originalname.length);
    const fileName = hashedFileName + ext;

    this.logger.log(`Generated filename: ${fileName}, bucket: ${this.bucketName}`);

    // 2. Upload ไฟล์เข้า MinIO Bucket with retry mechanism
    let lastError: any;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.logger.log(`Upload attempt ${attempt}/${retries} for ${fileName}`);
        await this.minio.client.putObject(this.bucketName, fileName, file.buffer, file.size, {
          'Content-Type': file.mimetype,
        });
        this.logger.log(`Successfully uploaded file: ${fileName}`);
        
        // 3. สร้าง URL สำหรับ return กลับไปบันทึกใน DB
        const protocol = this.configService.get('MINIO_USE_SSL') === 'true' ? 'https' : 'http';
        const host = this.configService.get('MINIO_ENDPOINT');
        const port = this.configService.get('MINIO_PORT');
        
        return {
          fileName: fileName 
        };
      } catch (err) {
        lastError = err;
        this.logger.warn(`Upload attempt ${attempt}/${retries} failed: ${err.message}`);
        
        if (attempt < retries) {
          const waitTime = attempt * 1000; // exponential backoff: 1s, 2s, 3s
          this.logger.log(`Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // All retries failed
    this.logger.error(`All ${retries} upload attempts failed for ${fileName}: ${lastError.message}`, lastError.stack);
    throw new HttpException(
      `Failed to upload file after ${retries} attempts. Please check MinIO connection.`, 
      HttpStatus.SERVICE_UNAVAILABLE
    );
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
    if (!fileName) {
      this.logger.warn('Empty filename provided for deletion, skipping');
      return;
    }
    
    try {
      this.logger.log(`Deleting file: ${fileName}`);
      await this.minio.client.removeObject(this.bucketName, fileName);
      this.logger.log(`Successfully deleted file: ${fileName}`);
    } catch (err) {
      this.logger.error(`Could not delete file: ${fileName} - ${err.message}`, err.stack);
      // Don't throw error, just log it (ถ้าไฟล์ไม่มีอยู่แล้ว ก็ไม่ต้อง error)
    }
  }
}