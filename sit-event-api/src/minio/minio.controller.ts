import { Controller, Get, Param, Query, Res, BadRequestException, UnauthorizedException, HttpStatus } from '@nestjs/common';
import { MinioClientService } from './minio-client.service';
import { Public } from 'nest-keycloak-connect';
import type { Response } from 'express';


@Controller('minio')
export class MinioController {
  constructor(private readonly minioClientService: MinioClientService) {}

  @Get('status')
  @Public()
  async checkStatus() {
    return this.minioClientService.checkStatus();
  }

  /**
   * Endpoint for serving files with signature verification
   * Usage: GET /minio/files/:fileName?signature=...&timestamp=...
   */
  @Get('files/:fileName')
  @Public()
  async getFile(
    @Param('fileName') fileName: string,
    @Query('signature') signature: string,
    @Query('timestamp') timestamp: string,
    @Res() res: Response,
  ) {
    // Validate query parameters
    if (!signature || !timestamp) {
      throw new BadRequestException('Missing signature or timestamp');
    }

    // Verify signature
    const isValid = this.minioClientService.verifySignature(fileName, timestamp, signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired signature');
    }

    try {
      // Get file metadata
      const metadata = await this.minioClientService.getFileMetadata(fileName);
      
      // Get file stream
      const stream = await this.minioClientService.getFileStream(fileName);

      // Set response headers
      res.setHeader('Content-Type', metadata.metaData?.['content-type'] || 'application/octet-stream');
      res.setHeader('Content-Length', metadata.size);
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

      // Stream file to response
      stream.pipe(res);
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve file');
    }
  }
}
