import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getPrismaStatus() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', message: 'Prisma is connected to the database' };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to connect to database',
        error: error.message,
      };
    }
  }
}
