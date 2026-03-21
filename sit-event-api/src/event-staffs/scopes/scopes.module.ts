import { Module } from '@nestjs/common';
import { ScopesController } from './scopes.controller';
import { ScopesService } from './scopes.service';
import { PrismaModule } from 'src/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ScopesController],
  providers: [ScopesService],
  exports: [ScopesService],
})
export class ScopesModule {}
