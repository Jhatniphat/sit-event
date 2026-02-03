import { Controller, Get } from '@nestjs/common';
import { MinioClientService } from './minio-client.service';
import { Public } from 'nest-keycloak-connect';


@Controller('minio')
export class MinioController {
  constructor(private readonly minioClientService: MinioClientService) {}

  @Get('status')
  @Public()
  async checkStatus() {
    return this.minioClientService.checkStatus();
  }
}
