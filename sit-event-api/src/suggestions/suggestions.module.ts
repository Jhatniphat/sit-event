import { Module } from '@nestjs/common';
import { SuggestionsService } from './suggestions.service';
import { SuggestionsController } from './suggestions.controller';
import { PrismaModule } from '../prisma.module';
import { MinioClientModule } from '../minio/minio.module';

@Module({
  imports: [PrismaModule, MinioClientModule],
  controllers: [SuggestionsController],
  providers: [SuggestionsService],
})
export class SuggestionsModule {}
