import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ConfigService } from '@nestjs/config';
import { SessionService } from './auth/session.service';
import axios from 'axios';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
  ) { }

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

  async getRedisStatus() {
    return this.sessionService.getRedisStatus();
  }

  async getKeycloakStatus() {
    try {
      const kcUrl = this.configService.get('KC_AUTH_SERVER_URL');
      const realm = this.configService.get('KC_REALM');
      if (!kcUrl || !realm) {
        return { status: 'error', message: 'Keycloak configuration is missing' };
      }

      const healthUrl = `${kcUrl}/realms/${realm}/.well-known/openid-configuration`;
      const response = await axios.get(healthUrl, { timeout: 5000 });

      if (response.status === 200) {
        return { status: 'ok', message: 'Keycloak is connected' };
      }
      return { status: 'error', message: `Keycloak returned status ${response.status}` };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to connect to Keycloak',
        error: error.message,
      };
    }
  }

  async getAllStatus() {
    const [database, redis, keycloak] = await Promise.all([
      this.getPrismaStatus(),
      this.getRedisStatus(),
      this.getKeycloakStatus(),
    ]);

    return {
      database,
      redis,
      keycloak,
      timestamp: new Date().toISOString(),
    };
  }
}
