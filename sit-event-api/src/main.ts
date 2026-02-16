import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

  console.log('🚀 Current APP_MODE:', process.env.APP_MODE);
  console.log('TZ Env:', process.env.CORS_ALLOWED_ORIGINS); 

  const app = await NestFactory.create(AppModule);

  // เรียกใช้ ConfigService
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Cookie parser middleware
  app.use(cookieParser());

  // Swagger Configuration — load from swagger.json
  const swaggerJsonPath = path.join(process.cwd(), 'swagger.json');
  const swaggerDocument = JSON.parse(fs.readFileSync(swaggerJsonPath, 'utf-8'));
  SwaggerModule.setup('api', app, swaggerDocument);

  logger.log(`Swagger documentation available at: http://localhost:${configService.get('PORT') ?? 3000}/api`);

  // ดึง CORS_ALLOWED_ORIGINS จาก env แล้วแปลงเป็น Array
  const corsOriginsRaw = configService.get<string>('CORS_ALLOWED_ORIGINS') || '';
  // แยกด้วย comma (,) และตัดช่องว่างออก
  const allowedOrigins = corsOriginsRaw.split(',').map(origin => origin.trim()).filter(origin => origin.length > 0);

  // Fallback: ถ้าใน env ไม่มีค่า ให้ใช้ค่า default เดิม (เพื่อความปลอดภัยตอน dev ปกติ)
  const finalOrigins = allowedOrigins.length > 0 ? allowedOrigins : [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:4200',
    'http://localhost:5500',
    'http://127.0.0.1:5500',

  ];

  // Enable CORS
  app.enableCors({
    origin: finalOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Cache-Control',
      'Pragma',
      'Expires',
      'Bypass-Tunnel-Reminder',
      'ngrok-skip-browser-warning',
    ],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`SIT Event API is running on: http://localhost:${port}`);
  logger.log(`CORS Allowed Origins: ${finalOrigins.join(', ')}`); // Log เพื่อเช็คว่าอ่านค่าถูกไหม
  logger.log(`Keycloak Login: http://localhost:${port}/auth/login`);
}
bootstrap();