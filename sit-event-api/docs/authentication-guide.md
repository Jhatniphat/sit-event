# SIT Event API - Keycloak Authentication

## Overview
API สำหรับระบบจัดการอีเวนต์ SIT ที่ใช้ Keycloak สำหรับ Authentication

## Authentication Endpoints

### 1. Get Login URL
```
GET /auth/login-url
```
**Response:**
```json
{
  "loginUrl": "http://localhost:8080/auth/realms/your-realm/protocol/openid-connect/auth?client_id=...",
  "message": "Login URL generated successfully"
}
```

### 2. Redirect to Login (Direct Redirect)
```
GET /auth/login
```
จะ redirect ไปหน้า login ของ Keycloak โดยตรง

### 3. Callback (Handle Login Response)
```
GET /auth/callback?code=...
```
**Response:**
```json
{
  "message": "Authentication successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 3600
  }
}
```

### 4. Get Logout URL
```
GET /auth/logout-url
```
**Response:**
```json
{
  "logoutUrl": "http://localhost:8080/auth/realms/your-realm/protocol/openid-connect/logout?redirect_uri=...",
  "message": "Logout URL generated successfully"
}
```

### 5. Logout (Direct Redirect)
```
GET /auth/logout
```
จะ redirect ไปหน้า logout ของ Keycloak โดยตรง

### 6. Get Current User (Protected)
```
GET /auth/me
Authorization: Bearer <access_token>
```
**Response:**
```json
{
  "user": {
    "id": "keycloak-user-id",
    "email": "user@example.com",
    "username": "john.doe",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["user", "student"]
  },
  "message": "Current user information"
}
```

## API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Health check | No |
| GET | `/health` | Application status | No |
| GET | `/auth/login-url` | Get Keycloak login URL | No |
| GET | `/auth/login` | Redirect to Keycloak login | No |
| GET | `/auth/callback` | Handle Keycloak callback | No |
| GET | `/auth/logout-url` | Get Keycloak logout URL | No |
| GET | `/auth/logout` | Redirect to Keycloak logout | No |
| GET | `/auth/me` | Get current user info | Yes |
| GET | `/events` | Get all events | No |
| POST | `/events` | Create new event | Yes (Event Organizer+) |
| GET | `/events/:id` | Get event by ID | Yes |
| PATCH | `/events/:id` | Update event | Yes (Event Organizer+) |
| DELETE | `/events/:id` | Delete event | Yes (Admin only) |

## Frontend Integration

### วิธีใช้งานสำหรับ Frontend

1. **เริ่มต้น Login Process:**
   ```javascript
   // Option 1: Get URL และ redirect เอง
   const response = await fetch('/auth/login-url');
   const { loginUrl } = await response.json();
   window.location.href = loginUrl;
   
   // Option 2: Direct redirect
   window.location.href = '/auth/login';
   ```

2. **Handle Callback (ใน Frontend):**
   ```javascript
   // ใน callback page (เช่น /callback)
   const urlParams = new URLSearchParams(window.location.search);
   const code = urlParams.get('code');
   
   if (code) {
     // Backend จะ handle callback และส่งผลลัพธ์กลับมา
     const response = await fetch(\`/auth/callback?code=\${code}\`);
     const result = await response.json();
     
     if (result.tokens) {
       // เก็บ tokens ใน localStorage หรือ cookie
       localStorage.setItem('accessToken', result.tokens.accessToken);
       localStorage.setItem('refreshToken', result.tokens.refreshToken);
       
       // Redirect ไปหน้าหลัก
       window.location.href = '/dashboard';
     }
   }
   ```

3. **Logout:**
   ```javascript
   // Clear local tokens
   localStorage.removeItem('accessToken');
   localStorage.removeItem('refreshToken');
   
   // Redirect to Keycloak logout
   window.location.href = '/auth/logout';
   ```

4. **Making Authenticated API Calls:**
   ```javascript
   // Get access token from storage
   const accessToken = localStorage.getItem('accessToken');
   
   // Make authenticated requests
   const response = await fetch('/events', {
     headers: {
       'Authorization': `Bearer ${accessToken}`,
       'Content-Type': 'application/json'
     }
   });
   
   // Create new event (creator ID will be automatically assigned)
   const eventData = {
     name: "Sample Event",
     description: "Event description",
     // ... other event fields
     // Note: NO need to include creatorId - it's automatically assigned from authenticated user
   };
   
   const createResponse = await fetch('/events', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${accessToken}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify(eventData)
   });
   ```

## Environment Variables

สร้างไฟล์ `.env` จาก `.env.example`:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/sit_event_db?schema=public"

# Keycloak Configuration
KC_AUTH_SERVER_URL="http://localhost:8080/auth"
KC_REALM="sit-event-realm"
KC_CLIENT_ID="sit-event-client"
KC_CLIENT_SECRET="your-client-secret"
KC_REDIRECT_URI="http://localhost:3000/auth/callback"
KC_LOGOUT_REDIRECT_URI="http://localhost:3000"

# Application
PORT=3000
```

## Keycloak Client Configuration

ใน Keycloak Admin Console:

1. **Client Settings:**
   - Client ID: `sit-event-client`
   - Client Protocol: `openid-connect`
   - Access Type: `confidential`

2. **Valid Redirect URIs:**
   - `http://localhost:3000/auth/callback`
   - `http://your-frontend-domain.com/auth/callback`

3. **Valid Post Logout Redirect URIs:**
   - `http://localhost:3000`
   - `http://your-frontend-domain.com`

4. **Web Origins:**
   - `http://localhost:3000`
   - `http://your-frontend-domain.com`

## User Data Flow

1. User เข้าสู่ระบบผ่าน Keycloak
2. Keycloak ส่ง callback พร้อม authorization code
3. Backend exchange code เป็น access token
4. Backend ดึงข้อมูล user จาก Keycloak
5. Backend สร้างหรืออัปเดต user ในฐานข้อมูลของเรา
6. ส่งข้อมูล user และ tokens กลับไปให้ Frontend

## User Role Assignment

ระบบจะกำหนด role ให้ user อัตโนมัติตามอีเมลที่ใช้เข้าสู่ระบบ:

- **INTERNAL_STUDENT**: อีเมลที่มีคำว่า "kmutt" ในส่วน domain (หลัง @)
  - ตัวอย่าง: `student@kmutt.ac.th`, `john.doe@mail.kmutt.ac.th`
  
- **EXTERNAL_STUDENT**: อีเมลอื่นๆ ที่ไม่มีคำว่า "kmutt"
  - ตัวอย่าง: `user@gmail.com`, `student@university.edu`

## Event Creation with Automatic Creator Assignment

เมื่อสร้าง event ใหม่:

1. **ไม่ต้องส่ง `creatorId`** ใน request body
2. ระบบจะดึง user ID จาก JWT token ที่ส่งมาใน Authorization header
3. ใช้อีเมลจาก token ไปหา user record ในฐานข้อมูล
4. กำหนด creator ของ event เป็น user ที่ล็อกอินอยู่โดยอัตโนมัติ

**ตัวอย่าง Event Creation Request:**
```json
{
  "name": "Tech Conference 2024",
  "description": "Annual technology conference",
  "images": ["image1.jpg", "image2.jpg"],
  "thumbnail": "thumbnail.jpg",
  "registrationOpenDate": "2024-01-01T00:00:00Z",
  "registrationEndDate": "2024-01-31T23:59:59Z",
  "eventStartDate": "2024-02-15T09:00:00Z",
  "eventEndDate": "2024-02-15T17:00:00Z",
  "targetAudience": ["INTERNAL_STUDENT", "EXTERNAL_STUDENT"],
  "tags": ["TECHNOLOGY", "EDUCATION"],
  "allowOnSiteRegister": true,
  "activityHours": 8,
  "needWifi": true,
  "certificateCriteria": "Attend full event"
}
```

**หมายเหตุ:** ไม่ต้องส่ง `creatorId` เพราะระบบจะกำหนดให้อัตโนมัติจาก authenticated user

## Testing

```bash
# Install dependencies
npm install

# Run development server
npm run start:dev

# Test endpoints
curl http://localhost:3000/auth/login-url
curl http://localhost:3000/health
```