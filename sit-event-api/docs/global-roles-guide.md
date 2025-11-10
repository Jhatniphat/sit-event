# Global Roles System Documentation

## Overview
ระบบ Global Roles ที่สามารถใช้ได้ทุก Services ใน SIT Event API

## Role Types

### 1. UserRole (บทบาทผู้ใช้หลัก)
```typescript
enum UserRole {
  ADMIN = 'admin',           // ผู้ดูแลระบบ
  TEACHER = 'teacher',       // อาจารย์
  STUDENT = 'student',       // นักเรียน/นักศึกษา
  STAFF = 'staff',          // เจ้าหน้าที่
  MODERATOR = 'moderator',   // ผู้ดูแล/กำกับ
}
```

### 2. EventRole (บทบาทในอีเวนต์)
```typescript
enum EventRole {
  ORGANIZER = 'organizer',       // ผู้จัดงาน
  COORDINATOR = 'coordinator',   // ผู้ประสานงาน
  VOLUNTEER = 'volunteer',       // อาสาสมัคร
  SPEAKER = 'speaker',          // วิทยากร
  PARTICIPANT = 'participant',   // ผู้เข้าร่วม
}
```

### 3. SystemRole (บทบาทระบบ)
```typescript
enum SystemRole {
  SUPER_ADMIN = 'super_admin',       // ผู้ดูแลระบบสูงสุด
  SYSTEM_ADMIN = 'system_admin',     // ผู้ดูแลระบบ
  CONTENT_MANAGER = 'content_manager', // ผู้จัดการเนื้อหา
  USER_MANAGER = 'user_manager',     // ผู้จัดการผู้ใช้
}
```

## Usage Examples

### 1. Basic Role Checking
```typescript
import { Roles, UserRole, EventRole } from '../common';

@Controller('events')
export class EventsController {
  
  // ใช้ enum values
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @Get('admin-only')
  adminOnlyEndpoint() { ... }
  
  // ตรวจสอบหลาย roles
  @Roles(EventRole.ORGANIZER, EventRole.COORDINATOR)
  @Post('manage-event')
  manageEvent() { ... }
}
```

### 2. Pre-defined Role Combinations
```typescript
import { AdminOnly, TeacherOrHigher, EventOrganizerAccess } from '../common';

@Controller('events')
export class EventsController {
  
  // เฉพาะ admin
  @AdminOnly()
  @Delete(':id')
  deleteEvent() { ... }
  
  // teacher ขึ้นไป (รวม admin)
  @TeacherOrHigher()
  @Get('teacher-content')
  getTeacherContent() { ... }
  
  // เฉพาะผู้จัดอีเวนต์
  @EventOrganizerAccess()
  @Post()
  createEvent() { ... }
}
```

### 3. Require All Roles
```typescript
import { Roles, RequireAllRoles, UserRole, EventRole } from '../common';

@Controller('special')
export class SpecialController {
  
  // ต้องมี TEACHER และ ORGANIZER ทั้งคู่
  @Roles(UserRole.TEACHER, EventRole.ORGANIZER)
  @RequireAllRoles()
  @Post('teacher-organizer-only')
  teacherOrganizerOnly() { ... }
}
```

### 4. Access Current User with Roles
```typescript
import { CurrentUser, type AuthenticatedUser } from '../common';

@Controller('profile')
export class ProfileController {
  
  @Get('me')
  getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    // Access user roles
    const roles = [
      ...(user.realm_access?.roles || []),
      ...(user.resource_access?.['client-id']?.roles || []),
    ];
    
    return { user, roles };
  }
}
```

## Role Hierarchy

ระบบมี Role Hierarchy ที่ role ระดับสูงสามารถทำงานแทน role ระดับต่ำได้:

```typescript
SUPER_ADMIN > SYSTEM_ADMIN > ADMIN > TEACHER > STUDENT
ORGANIZER > COORDINATOR > VOLUNTEER
```

### ตัวอย่าง:
- `SUPER_ADMIN` สามารถทำทุกอย่างได้
- `ADMIN` สามารถทำงานแทน `TEACHER`, `STUDENT` ได้
- `ORGANIZER` สามารถทำงานแทน `COORDINATOR`, `VOLUNTEER` ได้

## Helper Functions

```typescript
import { hasRole, hasAnyRole, hasHigherOrEqualRole } from '../common';

// ตรวจสอบ role เดียว
const isAdmin = hasRole(userRoles, UserRole.ADMIN);

// ตรวจสอบหลาย roles (มีอย่างน้อย 1 อัน)
const canManage = hasAnyRole(userRoles, [UserRole.ADMIN, UserRole.TEACHER]);

// ตรวจสอบรวม hierarchy
const canAccess = hasHigherOrEqualRole(userRoles, UserRole.TEACHER);
```

## Database Schema Updates

### User Model
```prisma
model User {
  id         String      @id @default(uuid())
  email      String      @unique
  userRole   UserRole    @default(STUDENT)   // บทบาทหลัก
  systemRole SystemRole?                     // บทบาทระบบ (optional)
  // ... other fields
}
```

### EventStaff Model
```prisma
model EventStaff {
  id        String    @id @default(uuid())
  eventId   String
  userId    String
  eventRole EventRole @default(PARTICIPANT)  // บทบาทในอีเวนต์
  status    StaffStatus
  // ... other fields
}
```

## Migration Required

หลังจากอัปเดต schema แล้วต้องรัน migration:

```bash
npx prisma migrate dev --name "add-global-roles"
npx prisma generate
```

## Setting Up Guards

### 1. Global Setup (ใน app.module.ts)
```typescript
import { RolesGuard } from './common';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,  // ใช้ custom RolesGuard แทน
    },
  ],
})
export class AppModule {}
```

### 2. Controller Level
```typescript
@UseGuards(RolesGuard)
@Controller('admin')
export class AdminController { ... }
```

## Available Decorators

| Decorator | Description | Example |
|-----------|-------------|---------|
| `@Roles(...)` | ตรวจสอบ roles ที่กำหนด | `@Roles(UserRole.ADMIN)` |
| `@RequireAllRoles()` | ต้องมีทุก roles ที่กำหนด | `@RequireAllRoles()` |
| `@AdminOnly()` | เฉพาะ admins | `@AdminOnly()` |
| `@TeacherOrHigher()` | teacher ขึ้นไป | `@TeacherOrHigher()` |
| `@EventOrganizerAccess()` | ผู้จัดอีเวนต์ | `@EventOrganizerAccess()` |
| `@StaffAccess()` | เจ้าหน้าที่ | `@StaffAccess()` |
| `@ContentManagerAccess()` | ผู้จัดการเนื้อหา | `@ContentManagerAccess()` |

## Integration with Keycloak

Roles จะถูกดึงจาก:
1. `user.realm_access.roles` - Realm roles จาก Keycloak
2. `user.resource_access[clientId].roles` - Client roles จาก Keycloak  
3. `user.roles` - Custom roles array
4. `user.role` - Single role field

ระบบจะรวม roles จากทุกแหล่งและทำการตรวจสอบ