import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import KcAdminClient from '@keycloak/keycloak-admin-client';

@Injectable()
export class KeycloakAdminService {
  private readonly logger = new Logger(KeycloakAdminService.name);
  private kcAdminClient: KcAdminClient;

  constructor(private readonly configService: ConfigService) {
    this.initKeycloakClient();
  }

  private initKeycloakClient() {
    this.kcAdminClient = new KcAdminClient({
      baseUrl: this.configService.get('KC_AUTH_SERVER_URL'),
      realmName: this.configService.get('KC_REALM'),
    });
  }

  private async authenticate() {
    // ต้องเปิด Service Accounts Enabled ใน Keycloak Client ก่อน
    await this.kcAdminClient.auth({
      clientId: this.configService.get('KC_CLIENT_ID')!,
      clientSecret: this.configService.get('KC_CLIENT_SECRET'),
      grantType: 'client_credentials', // ใช้โหมดนี้สำหรับการทำงานหลังบ้าน
    });
  }

  async assignRoleToUser(userId: string, roleName: string) {
    try {
      await this.authenticate();

      // 1. หา Role object จากชื่อ (เช่น 'INTERNAL_STUDENT')
      // หมายเหตุ: ต้องมั่นใจว่า Role นี้ถูกสร้างไว้ใน Realm Roles แล้ว
      const role = await this.kcAdminClient.roles.findOneByName({
        name: roleName,
      });

      if (!role) {
        this.logger.error(`Role '${roleName}' not found in Keycloak`);
        return;
      }

      // 2. สั่ง Map Role เข้ากับ User
      await this.kcAdminClient.users.addRealmRoleMappings({
        id: userId,
        roles: [
          {
            id: role.id!,
            name: role.name!,
          },
        ],
      });

      this.logger.log(`Assigned role '${roleName}' to user '${userId}' in Keycloak`);
    } catch (error) {
      this.logger.error(`Failed to assign role in Keycloak: ${error.message}`);
    }
  }
}