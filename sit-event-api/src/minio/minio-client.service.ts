import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { MinioService } from 'nestjs-minio-client';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { createHmac } from 'crypto';

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

  public async checkStatus(): Promise<{ status: string; message: string }> {
    try {
      await this.minio.client.listBuckets();
      return { status: 'ok', message: 'MinIO connection is healthy' };
    } catch (error) {
      this.logger.error('MinIO connection failed', error);
      return { status: 'error', message: 'MinIO connection failed: ' + error.message };
    }
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
    const fileName = this.getFileNameFromUrl(fileNameOrUrl);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = this.generateSignature(fileName, timestamp);
    
    // Get API root URL from config
    const apiRootUrl = this.configService.get('API_ROOT_URL') || 'http://localhost:3000/api';
    
    // Return full signed API endpoint URL
    return `${apiRootUrl}/minio/files/${encodeURIComponent(fileName)}?signature=${signature}&timestamp=${timestamp}`;
  }

  /**
   * Generate HMAC-SHA256 signature for file access
   * Similar to MinIO presigned URL signature generation
   */
  private generateSignature(fileName: string, timestamp: string): string {
    const secretKey = this.configService.get('MINIO_SECRET_KEY') || '';
    const stringToSign = `GET\n${fileName}\n${timestamp}`;
    
    const signature = createHmac('sha256', secretKey)
      .update(stringToSign)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    return signature;
  }

  /**
   * Verify the signature for file access
   * Returns true if signature is valid and timestamp is not expired
   */
  public verifySignature(fileName: string, timestamp: string, signature: string): boolean {
    // Check if timestamp is not expired (24 hours)
    const currentTime = Math.floor(Date.now() / 1000);
    const expiry = 24 * 60 * 60; // 24 hours
    
    if (currentTime - parseInt(timestamp) > expiry) {
      this.logger.warn(`Signature expired for file: ${fileName}`);
      return false;
    }
    
    // Verify signature
    const expectedSignature = this.generateSignature(fileName, timestamp);
    if (signature !== expectedSignature) {
      this.logger.warn(`Invalid signature for file: ${fileName}`);
      return false;
    }
    
    return true;
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

  // ... (existing code)

  public async getFile(fileNameOrUrl: string): Promise<Buffer> {
    const fileName = this.getFileNameFromUrl(fileNameOrUrl);
    try {
      // ดึง stream จาก MinIO
      const stream = await this.minio.client.getObject(this.bucketName, fileName);
      
      // แปลง Stream เป็น Buffer
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', (err) => reject(err));
      });
    } catch (err) {
      this.logger.error(`Could not get file: ${fileName}`, err);
      throw new HttpException('Could not retrieve file for preview', HttpStatus.NOT_FOUND);
    }
  }

  /**
   * Get file stream from MinIO (for streaming response)
   */
  public async getFileStream(fileNameOrUrl: string): Promise<NodeJS.ReadableStream> {
    const fileName = this.getFileNameFromUrl(fileNameOrUrl);
    try {
      this.logger.log(`Getting file stream for: ${fileName}`);
      return await this.minio.client.getObject(this.bucketName, fileName);
    } catch (err) {
      this.logger.error(`Could not get file stream: ${fileName}`, err);
      throw new HttpException('Could not retrieve file', HttpStatus.NOT_FOUND);
    }
  }

  /**
   * Get file metadata (size, content-type, etc.)
   */
  public async getFileMetadata(fileNameOrUrl: string): Promise<any> {
    const fileName = this.getFileNameFromUrl(fileNameOrUrl);
    try {
      return await this.minio.client.statObject(this.bucketName, fileName);
    } catch (err) {
      this.logger.error(`Could not get file metadata: ${fileName}`, err);
      throw new HttpException('Could not retrieve file metadata', HttpStatus.NOT_FOUND);
    }
  }
}