# SIT Event API - Events Management Guide

## Overview
API endpoints สำหรับจัดการอีเวนต์ในระบบ SIT Event Management

## Authentication & Authorization

### Required Roles for Event Operations:
- **Create Event**: `EVENT_ORGANIZER` หรือ `ADMIN`
- **View Events**: ทุกคน (public สำหรับ list, authenticated สำหรับ detail)
- **Update Event**: `EVENT_ORGANIZER` หรือ `ADMIN`
- **Delete Event**: `ADMIN` เท่านั้น

## Events API Endpoints

### 1. Get All Events (Public)
```
GET /events
```
**Description:** ดึงรายการอีเวนต์ทั้งหมด เรียงตาม createdAt จากใหม่ไปเก่า

**Response:**
```json
[
  {
    "id": "event-uuid",
    "name": "Tech Conference 2024",
    "description": "Annual technology conference",
    "images": ["image1.jpg", "image2.jpg"],
    "thumbnail": "thumbnail.jpg",
    "registrationOpenDate": "2024-01-01T00:00:00.000Z",
    "registrationEndDate": "2024-01-31T23:59:59.000Z",
    "eventStartDate": "2024-02-15T09:00:00.000Z",
    "eventEndDate": "2024-02-15T17:00:00.000Z",
    "targetAudience": ["INTERNAL_STUDENT", "EXTERNAL_STUDENT"],
    "tags": ["TECHNOLOGY", "EDUCATION"],
    "allowOnSiteRegister": true,
    "activityHours": 8,
    "invitation": null,
    "website": "https://event.example.com",
    "needWifi": true,
    "certificateCriteria": "Attend full event",
    "creatorId": "creator-uuid",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### 2. Get Event by ID (Protected)
```
GET /events/:id
Authorization: Bearer <access_token>
```
**Description:** ดึงข้อมูลอีเวนต์ตาม ID

**Response:**
```json
{
  "id": "event-uuid",
  "name": "Tech Conference 2024",
  "description": "Annual technology conference",
  // ... all event fields
}
```

**Error Response:**
```json
{
  "statusCode": 404,
  "message": "Event with ID 'invalid-id' not found.",
  "error": "Not Found"
}
```

### 3. Create New Event (Protected - Event Organizer+)
```
POST /events
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
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
  "invitation": "Special invitation text",
  "website": "https://event.example.com",
  "needWifi": true,
  "certificateCriteria": "Attend full event"
}
```

**Important Notes:**
- 🚫 **ไม่ต้องส่ง `creatorId`** - ระบบจะกำหนดอัตโนมัติจาก authenticated user
- ✅ ระบบจะดึง user email จาก JWT token และหา user ID ในฐานข้อมูล
- ✅ กำหนด creator ของ event เป็น user ที่ล็อกอินอยู่

**Response:**
```json
{
  "id": "new-event-uuid",
  "name": "Tech Conference 2024",
  "description": "Annual technology conference",
  "creatorId": "auto-assigned-creator-id",
  // ... all other fields
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 4. Update Event (Protected - Event Organizer+)
```
PATCH /events/:id
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:** (ส่งเฉพาะฟิลด์ที่ต้องการอัปเดต)
```json
{
  "name": "Updated Event Name",
  "description": "Updated description",
  "activityHours": 10
}
```

**Response:**
```json
{
  "id": "event-uuid",
  "name": "Updated Event Name",
  "description": "Updated description",
  // ... all fields with updated values
}
```

### 5. Delete Event (Protected - Admin Only)
```
DELETE /events/:id
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "deleted-event-uuid",
  "name": "Deleted Event Name",
  // ... all fields of deleted event
}
```

## Field Validation

### Required Fields:
- `name` (string, not empty)
- `description` (string, not empty)
- `images` (array of strings)
- `thumbnail` (string, not empty)
- `registrationOpenDate` (ISO date string)
- `registrationEndDate` (ISO date string)
- `eventStartDate` (ISO date string)
- `eventEndDate` (ISO date string)
- `targetAudience` (array of TargetAudience enum values)
- `tags` (array of EventTag enum values)

### Optional Fields:
- `allowOnSiteRegister` (boolean, default: false)
- `activityHours` (integer)
- `invitation` (string)
- `website` (valid URL)
- `needWifi` (boolean, default: false)
- `certificateCriteria` (string)

### Enum Values:

**TargetAudience:**
- `INTERNAL_STUDENT`
- `EXTERNAL_STUDENT`
- `FACULTY`
- `STAFF`
- `PUBLIC`

**EventTag:**
- `TECHNOLOGY`
- `EDUCATION`
- `WORKSHOP`
- `SEMINAR`
- `COMPETITION`
- `NETWORKING`
- `CAREER`
- `RESEARCH`
- `CULTURE`
- `SPORTS`

## Error Handling

### Common Error Responses:

**401 Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**403 Forbidden:**
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions"
}
```

**404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "Event with ID 'invalid-id' not found.",
  "error": "Not Found"
}
```

**400 Validation Error:**
```json
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "images must be an array",
    "eventStartDate must be a valid ISO 8601 date string"
  ],
  "error": "Bad Request"
}
```

## Frontend Integration Examples

### 1. Fetch All Events (No Auth Required)
```javascript
const response = await fetch('/events');
const events = await response.json();
console.log('All events:', events);
```

### 2. Create Event with Authentication
```javascript
const accessToken = localStorage.getItem('accessToken');

const eventData = {
  name: "My New Event",
  description: "Event description",
  images: ["image1.jpg"],
  thumbnail: "thumb.jpg",
  registrationOpenDate: "2024-01-01T00:00:00Z",
  registrationEndDate: "2024-01-31T23:59:59Z",
  eventStartDate: "2024-02-15T09:00:00Z",
  eventEndDate: "2024-02-15T17:00:00Z",
  targetAudience: ["INTERNAL_STUDENT"],
  tags: ["EDUCATION"],
  allowOnSiteRegister: true,
  activityHours: 6
  // No creatorId needed - automatically assigned!
};

try {
  const response = await fetch('/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventData)
  });

  if (response.ok) {
    const newEvent = await response.json();
    console.log('Event created:', newEvent);
    console.log('Creator ID automatically assigned:', newEvent.creatorId);
  } else {
    const error = await response.json();
    console.error('Error creating event:', error);
  }
} catch (error) {
  console.error('Network error:', error);
}
```

### 3. Update Event
```javascript
const accessToken = localStorage.getItem('accessToken');
const eventId = 'event-uuid-to-update';

const updateData = {
  name: "Updated Event Name",
  activityHours: 8
};

const response = await fetch(`/events/${eventId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(updateData)
});

const updatedEvent = await response.json();
```

## Best Practices

1. **Event Creation:**
   - ตรวจสอบ user ล็อกอินแล้วก่อนเรียก create API
   - ไม่ต้องส่ง `creatorId` ในข้อมูล - ระบบจัดการให้อัตโนมัติ
   - Validate วันที่ให้ถูกต้อง (วันจบต้องหลังวันเริ่ม)

2. **Error Handling:**
   - ตรวจสอบ status code ก่อนใช้ response data
   - แสดง error message ที่เป็นมิตรกับผู้ใช้
   - Handle network errors และ timeout

3. **Authentication:**
   - เก็บ access token ใน secure storage
   - Implement token refresh mechanism
   - Handle token expiration gracefully

4. **Performance:**
   - Cache event list เมื่อเหมาะสม
   - Implement pagination สำหรับ event list (จะเพิ่มในอนาคต)
   - Optimize image loading