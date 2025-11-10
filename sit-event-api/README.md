<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

# SIT Event Management API

API สำหรับระบบจัดการอีเวนต์ SIT ที่ใช้ NestJS, Prisma, และ Keycloak Authentication

## Features

- 🔐 **Keycloak Authentication Integration**
- 👥 **Automatic User Role Assignment** (INTERNAL_STUDENT สำหรับอีเมล @kmutt, EXTERNAL_STUDENT สำหรับอื่นๆ)
- 📅 **Event Management** (Create, Read, Update, Delete)
- 🛡️ **Role-based Access Control**
- 🏗️ **Automatic Creator Assignment** เมื่อสร้าง Event
- 📚 **Comprehensive API Documentation**

## Quick Start

### Prerequisites
- Node.js (v18+)
- PostgreSQL Database
- Keycloak Server

### Installation

```bash
# Clone repository
git clone <repository-url>
cd sit-event-api

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database
npx prisma migrate dev

# Start development server
npm run start:dev
```

## API Documentation

### 📖 Complete Guides

- **[Authentication Guide](docs/authentication-guide.md)** - Keycloak integration, login flow, และ user management
- **[Events API Guide](docs/events-api-guide.md)** - Events management, automatic creator assignment
- **[Global Roles Guide](docs/global-roles-guide.md)** - Role-based access control

### 🚀 Key Features

#### Automatic User Role Assignment
```typescript
// Email ที่มี 'kmutt' ใน domain → INTERNAL_STUDENT
user@kmutt.ac.th → INTERNAL_STUDENT
student@mail.kmutt.ac.th → INTERNAL_STUDENT

// Email อื่นๆ → EXTERNAL_STUDENT  
user@gmail.com → EXTERNAL_STUDENT
student@university.edu → EXTERNAL_STUDENT
```

#### Automatic Event Creator Assignment
```javascript
// ✅ ไม่ต้องส่ง creatorId - ระบบจัดการอัตโนมัติ
const eventData = {
  name: "Tech Conference 2024",
  description: "Annual tech event",
  // ... other fields
  // ❌ creatorId: "some-id" <- ไม่ต้องส่ง!
};

fetch('/events', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(eventData)
});
```

## Project Structure

```
src/
├── auth/              # Keycloak authentication
├── users/             # User management
├── events/            # Event management  
├── common/            # Shared utilities
│   ├── decorators/    # Custom decorators (@CurrentUser, @Roles)
│   ├── enums/         # Role enums
│   └── guards/        # Authorization guards
├── prisma/            # Database schema & migrations
└── docs/              # API documentation
```

## Environment Configuration

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/sit_event_db"

# Keycloak
KC_AUTH_SERVER_URL="http://localhost:8080/auth"
KC_REALM="sit-event-realm"
KC_CLIENT_ID="sit-event-client"
KC_CLIENT_SECRET="your-client-secret"
KC_REDIRECT_URI="http://localhost:3000/auth/callback"
KC_LOGOUT_REDIRECT_URI="http://localhost:3000"

# Application
PORT=3000
```

## Development Commands

### Project Setup
```bash
# Install dependencies
npm install

# Set up database schema
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Start development server
npm run start:dev
```

### Database Commands
```bash
# Apply migrations
npx prisma migrate dev

# Reset database (development only)
npx prisma migrate reset

# View database in Prisma Studio
npx prisma studio
```

### Build & Test
```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod

# Tests
npm run test
npm run test:e2e
npm run test:cov
```

## API Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/auth/login-url` | Get Keycloak login URL | No |
| GET | `/auth/callback` | Handle Keycloak callback | No |
| GET | `/auth/me` | Get current user info | Yes |
| GET | `/events` | Get all events | No |
| POST | `/events` | Create event (auto-assign creator) | Yes |
| GET | `/events/:id` | Get event by ID | Yes |
| PATCH | `/events/:id` | Update event | Yes |
| DELETE | `/events/:id` | Delete event (Admin only) | Yes |

## Technology Stack

- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with Prisma ORM  
- **Authentication**: Keycloak (OpenID Connect)
- **Language**: TypeScript
- **Validation**: class-validator
- **Testing**: Jest

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is [MIT licensed](LICENSE).
