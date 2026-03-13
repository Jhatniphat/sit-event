import { Module, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { UsersModule } from '../users/users.module';
import { KeycloakAdminService } from './keycloak-admin.service';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [AuthController],
  providers: [AuthService, SessionService, KeycloakAdminService],
  exports: [AuthService, SessionService, KeycloakAdminService],
})
export class AuthModule { }