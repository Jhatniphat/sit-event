# Session Management Guide

## Overview
ระบบนี้ได้เพิ่มการจัดการ Session ด้วย Redis และ Cookies สำหรับการ Authentication ใน SIT Event API

## Flow การทำงาน

### 1. Login Flow
1. หน้าบ้านยิง `GET /auth/login`
2. API จะ redirect ไป Keycloak login page
3. User login ใน Keycloak
4. Keycloak redirect กลับมาที่ `/auth/callback` พร้อม authorization code
5. API จะ:
   - Exchange code กับ Keycloak เพื่อได้ tokens
   - สร้าง Session ใน Redis
   - Set secure cookie ที่มี signed session ID
   - Return response พร้อมข้อมูล user

### 2. Session Validation
1. หน้าบ้านยิง `GET /auth/session` พร้อม cookie
2. API จะ:
   - อ่าน session cookie
   - Validate signature
   - ดึงข้อมูล session จาก Redis
   - Return session data หรือ error

### 3. Logout Flow
1. หน้าบ้านยิง `GET /auth/logout`
2. API จะ:
   - ลบ session จาก Redis
   - Clear session cookie
   - Redirect ไป Keycloak logout

## API Endpoints

### POST /auth/callback
**Description**: Handle Keycloak callback และสร้าง session

**Parameters**:
- `code`: Authorization code จาก Keycloak

**Response**:
```json
{
  "message": "Authentication successful",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "userRole": "INTERNAL_STUDENT"
  },
  "sessionCreated": true
}
```

**Cookies Set**:
- `session`: Signed session cookie (HttpOnly, Secure in production)

### GET /auth/session
**Description**: Validate session และ return ข้อมูล session

**Headers Required**:
- Cookie: session=<signed-session-cookie>

**Response (Success)**:
```json
{
  "valid": true,
  "session": {
    "sessionId": "uuid",
    "userId": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "userRole": "INTERNAL_STUDENT",
    "accessToken": "keycloak-access-token",
    "refreshToken": "keycloak-refresh-token",
    "expiresIn": 300,
    "tokenType": "Bearer",
    "createdAt": "2023-11-11T10:00:00.000Z",
    "expiresAt": "2023-11-12T10:00:00.000Z"
  },
  "message": "Session is valid"
}
```

**Response (Invalid)**:
```json
{
  "valid": false,
  "message": "Session not found or expired"
}
```

### GET /auth/logout
**Description**: Logout และลบ session

**Response**: Redirect to Keycloak logout URL

## Environment Variables

เพิ่มใน `.env`:
```bash
# Redis Configuration for Sessions
REDIS_URL="redis://localhost:6379"

# Session Configuration
SESSION_SECRET="your-super-secret-session-key-change-this-in-production"
```

## Security Features

### 1. Signed Cookies
- Session cookies จะถูก sign ด้วย HMAC-SHA256
- ป้องกันการแก้ไข cookie โดยไม่ได้รับอนุญาต

### 2. Session Expiration
- Session จะหมดอายุใน 24 ชั่วโมง
- Auto-extend TTL เมื่อมีการใช้งาน

### 3. Secure Cookies
- `HttpOnly`: ป้องกัน XSS attacks
- `Secure`: ใช้ HTTPS ใน production
- `SameSite`: ป้องกัน CSRF attacks

### 4. Redis Storage
- Session data เก็บใน Redis
- Auto-cleanup เมื่อหมดอายุ

## Development Setup

### 1. Install Redis
```bash
# Windows (ถ้ายังไม่ติดตั้ง)
# Download Redis from official website หรือใช้ WSL

# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis
```

### 2. Start Redis
```bash
redis-server
```

### 3. Test Redis Connection
```bash
redis-cli ping
# Should return PONG
```

## Usage Examples

### Frontend Integration

#### 1. Login
```javascript
// Redirect to login
window.location.href = 'http://localhost:3000/auth/login';
```

#### 2. Check Session
```javascript
const checkSession = async () => {
  try {
    const response = await fetch('http://localhost:3000/auth/session', {
      credentials: 'include' // Important: Include cookies
    });
    const data = await response.json();
    
    if (data.valid) {
      console.log('User:', data.session);
      return data.session;
    } else {
      console.log('No valid session');
      return null;
    }
  } catch (error) {
    console.error('Session check failed:', error);
    return null;
  }
};
```

#### 3. Logout
```javascript
const logout = async () => {
  window.location.href = 'http://localhost:3000/auth/logout';
};
```

## Monitoring และ Debugging

### 1. Redis Commands
```bash
# ดู sessions ทั้งหมด
redis-cli KEYS "session:*"

# ดูข้อมูล session
redis-cli GET "session:session-id"

# ลบ session
redis-cli DEL "session:session-id"
```

### 2. Session Cleanup
```javascript
// API จะทำ auto-cleanup แต่สามารถเรียกได้ด้วย:
await sessionService.cleanupExpiredSessions();
```

## Error Handling

### Common Errors
1. **"No session cookie found"**: Client ไม่ส่ง cookie หรือ cookie หมดอายุ
2. **"Invalid session cookie signature"**: Cookie ถูกแก้ไข
3. **"Session not found or expired"**: Session หมดอายุหรือถูกลบจาก Redis
4. **Redis Connection Error**: Redis server ไม่ทำงานหรือ connection ผิดพลาด