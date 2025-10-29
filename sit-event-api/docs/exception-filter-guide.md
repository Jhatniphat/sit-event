# Exception Filter Usage Guide

## วิธีใช้งาน Global Exception Filter

### 1. เปิดใช้งานใน main.ts
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // เปิดใช้งาน Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  await app.listen(3000);
}
bootstrap();
```

### 2. หรือใช้ใน AppModule (แนะนำ)
```typescript
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './exceptions.filter';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
```

## ประเภท Error ที่จัดการ

### 1. Prisma Database Errors
- **P2002**: Unique constraint (409 Conflict)
- **P2025**: Record not found (404 Not Found)  
- **P2003**: Foreign key constraint (400 Bad Request)
- **P2014**: Required relation violation (400 Bad Request)

### 2. NestJS HTTP Exceptions
- ValidationPipe errors (400 Bad Request)
- NotFoundException (404 Not Found)
- UnauthorizedException (401 Unauthorized)
- ForbiddenException (403 Forbidden)

### 3. General JavaScript Errors
- แปลงเป็น 500 Internal Server Error
- ซ่อน sensitive details ใน production

## Response Format
```json
{
  "statusCode": 409,
  "timestamp": "2025-10-29T10:30:00.000Z",
  "path": "/events",
  "method": "POST",
  "error": "Conflict",
  "message": "name already exists"
}
```

## ข้อดี
- **Consistent API responses**: Error format เหมือนกันทุก endpoint
- **Security**: ซ่อน database error details ใน production
- **Debugging**: Log errors พร้อม stack trace
- **User-friendly**: แปลง technical errors เป็นข้อความที่เข้าใจง่าย
- **Type safety**: ใช้ TypeScript types จาก Prisma

## ตัวอย่างการใช้งาน

### ใน Service
```typescript
// ไม่ต้อง try-catch - Exception Filter จะจัดการให้
async createEvent(dto: CreateEventDto) {
  return this.prisma.event.create({ data: dto });
  // ถ้า name ซ้ำ จะ throw P2002 → แปลงเป็น 409 Conflict
}

async findEvent(id: string) {
  const event = await this.prisma.event.findUniqueOrThrow({
    where: { id }
  });
  // ถ้าไม่เจอ จะ throw P2025 → แปลงเป็น 404 Not Found
  return event;
}
```

### ใน Controller
```typescript
@Post()
create(@Body() dto: CreateEventDto) {
  // ValidationPipe จะ validate DTO
  // ถ้า validation ล้มเหลว จะแปลงเป็น 400 Bad Request
  return this.eventsService.createEvent(dto);
}
```