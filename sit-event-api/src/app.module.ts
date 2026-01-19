import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsModule } from './events/events.module';
import { GlobalExceptionFilter } from './exceptions.filter';
import { APP_GUARD } from "@nestjs/core";
import {
  AuthGuard,
  KeycloakConnectConfig,
  KeycloakConnectModule,
  PolicyEnforcementMode,
  ResourceGuard,
  TokenValidation,
} from 'nest-keycloak-connect';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SessionMiddleware } from './common/middleware/session.middleware';
import { SessionService } from './auth/session.service';
import { EventRegistrationsModule } from './event-registrations/event-registrations.module';
import { RolesGuard } from './common';
import { EventStaffsModule } from './event-staffs/event-staffs.module';
import { PrismaService } from './prisma.service';
import { MinioClientModule } from './minio/minio.module';
import { EventSessionsModule } from './event-sessions/event-sessions.module';
import { EventFormsModule } from './event-forms/event-forms.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // ถ้า APP_MODE เป็น 'mobile' ให้โหลด .env.mobile ถ้าไม่ใช่ให้โหลด .env ปกติ
      envFilePath: process.env.APP_MODE === 'mobile' ? '.env.mobile' : '.env',
    }),
    KeycloakConnectModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): KeycloakConnectConfig => ({
        authServerUrl: configService.get("KC_AUTH_SERVER_URL"),
        realm: configService.get("KC_REALM"),
        clientId: configService.get("KC_CLIENT_ID"),
        secret: configService.get("KC_CLIENT_SECRET") || "",
        policyEnforcement: PolicyEnforcementMode.PERMISSIVE,
        tokenValidation: TokenValidation.OFFLINE, 
        bearerOnly: false,
        'ssl-required': 'none',
      }),
    }),
    EventsModule,
    UsersModule,
    AuthModule,
    EventRegistrationsModule,
    EventStaffsModule,
    MinioClientModule,
    EventSessionsModule,
    EventFormsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ResourceGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    PrismaService,
    SessionService,
    { provide: 'APP_FILTER', useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SessionMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}