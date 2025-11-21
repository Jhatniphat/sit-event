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
      url: url, 
      fileName: fileName 
    };
  }

  public async deleteFile(fileName: string) {
    try {
      await this.minio.client.removeObject(this.bucketName, fileName);
    } catch (err) {
      this.logger.error(`Could not delete file: ${fileName}`, err);
    }
  }
}