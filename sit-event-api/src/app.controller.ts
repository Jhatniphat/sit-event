import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from 'nest-keycloak-connect';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      message: 'SIT Event API is running',
    };
  }

  @Public()
  @Get('prisma-status')
  async getPrismaStatus() {
    return this.appService.getPrismaStatus();
  }

  @Public()
  @Get('status/redis')
  async getRedisStatus() {
    return this.appService.getRedisStatus();
  }

  @Public()
  @Get('status/keycloak')
  async getKeycloakStatus() {
    return this.appService.getKeycloakStatus();
  }

  @Public()
  @Get('status')
  async getAllStatus() {
    return this.appService.getAllStatus();
  }

  @Public()
  @Get('status/websocket')
  getWebsocketTest() {
    return {
      status: 'ok',
      message: 'WebSocket endpoint is ready for connection from frontend',
      timestamp: new Date().toISOString(),
    };
  }
}
