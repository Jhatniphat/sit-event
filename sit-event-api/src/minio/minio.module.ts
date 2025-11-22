import { Module, Global } from '@nestjs/common';
import { MinioModule } from 'nestjs-minio-client';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MinioClientService } from './minio-client.service';

@Global()
@Module({
  imports: [
    MinioModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        endPoint: configService.get('MINIO_ENDPOINT') || 'localhost',
        port: parseInt(configService.get('MINIO_PORT') || '9000'),
        useSSL: configService.get('MINIO_USE_SSL') === 'true',
        accessKey: configService.get('MINIO_ACCESS_KEY') || '',
        secretKey: configService.get('MINIO_SECRET_KEY') || '',
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [MinioClientService],
  exports: [MinioClientService],
})
export class MinioClientModule {}