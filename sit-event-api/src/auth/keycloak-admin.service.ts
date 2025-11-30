import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import KcAdminClient from '@keycloak/keycloak-admin-client';
import { UserRole } from '../common/enums/roles.enum';

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

  /**
   * Get all realm roles assigned to a user from Keycloak
   */
  async getUserRoles(userId: string): Promise<string[]> {
    try {
      await this.authenticate();

      const roles = await this.kcAdminClient.users.listRealmRoleMappings({
        id: userId,
      });

      const roleNames = roles.map(role => role.name).filter(name => name !== undefined) as string[];
      this.logger.log(`Retrieved ${roleNames.length} roles for user '${userId}': ${roleNames.join(', ')}`);
      
      return roleNames;
    } catch (error) {
      this.logger.error(`Failed to get user roles from Keycloak: ${error.message}`);
      return [];
    }
  }

  /**
   * Map Keycloak role names to UserRole enum array
   * Filters out unrecognized roles
   */
  mapKeycloakRolesToEnum(keycloakRoles: string[]): UserRole[] {
    const roleMap: Record<string, UserRole> = {
      'ADMIN': UserRole.ADMIN,
      'ORGANIZER': UserRole.ORGANIZER,
      'INTERNAL_STUDENT': UserRole.INTERNAL_STUDENT,
      'EXTERNAL_STUDENT': UserRole.EXTERNAL_STUDENT,
    };

    const mappedRoles = keycloakRoles
      .map(role => roleMap[role.toUpperCase()])
      .filter(role => role !== undefined);

    this.logger.log(`Mapped Keycloak roles [${keycloakRoles.join(', ')}] to [${mappedRoles.join(', ')}]`);
    
    return mappedRoles;
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

  /**
   * Assign multiple roles to a user in Keycloak
   */
  async assignRolesToUser(userId: string, roleNames: string[]) {
    try {
      await this.authenticate();

      const rolesToAssign: Array<{ id: string; name: string }> = [];
      
      for (const roleName of roleNames) {
        const role = await this.kcAdminClient.roles.findOneByName({
          name: roleName,
        });

        if (role) {
          rolesToAssign.push({
            id: role.id!,
            name: role.name!,
          });
        } else {
          this.logger.warn(`Role '${roleName}' not found in Keycloak, skipping`);
        }
      }

      if (rolesToAssign.length > 0) {
        await this.kcAdminClient.users.addRealmRoleMappings({
          id: userId,
          roles: rolesToAssign,
        });

        this.logger.log(`Assigned ${rolesToAssign.length} roles to user '${userId}' in Keycloak`);
      }
    } catch (error) {
      this.logger.error(`Failed to assign roles in Keycloak: ${error.message}`);
    }
  }
}