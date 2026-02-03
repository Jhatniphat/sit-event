import { Module } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { CertificatesController } from './certificates.controller';
import { PrismaModule } from '../prisma.module';
import { MinioClientModule } from '../minio/minio.module';

@Module({
  imports: [PrismaModule, MinioClientModule],
  controllers: [CertificatesController],
  providers: [CertificatesService],
})
export class CertificatesModule {}