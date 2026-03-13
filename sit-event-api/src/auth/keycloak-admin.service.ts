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
   * Get the primary realm role assigned to a user from Keycloak
   * Returns the first matching role from our UserRole enum
   */
  async getUserRole(userId: string): Promise<UserRole | null> {
    try {
      await this.authenticate();

      const roles = await this.kcAdminClient.users.listRealmRoleMappings({
        id: userId,
      });

      const roleNames = roles.map(role => role.name).filter(name => name !== undefined) as string[];
      this.logger.log(`Retrieved ${roleNames.length} roles for user '${userId}': ${roleNames.join(', ')}`);

      // Map and return the first valid role
      const mappedRole = this.mapKeycloakRoleToEnum(roleNames);
      return mappedRole;
    } catch (error) {
      this.logger.error(`Failed to get user role from Keycloak: ${error.message}`);
      return null;
    }
  }

  /**
   * Map Keycloak role names to a single UserRole enum
   * Returns the first recognized role, prioritizing ADMIN > ORGANIZER > INTERNAL_STUDENT > EXTERNAL_STUDENT
   */
  mapKeycloakRoleToEnum(keycloakRoles: string[]): UserRole | null {
    const roleMap: Record<string, UserRole> = {
      'ADMIN': UserRole.ADMIN,
      'ORGANIZER': UserRole.ORGANIZER,
      'INTERNAL_STUDENT': UserRole.INTERNAL_STUDENT,
      'EXTERNAL_STUDENT': UserRole.EXTERNAL_STUDENT,
    };

    // Priority order for roles
    const rolePriority = ['ADMIN', 'ORGANIZER', 'INTERNAL_STUDENT', 'EXTERNAL_STUDENT'];

    for (const priority of rolePriority) {
      if (keycloakRoles.some(r => r.toUpperCase() === priority)) {
        const mappedRole = roleMap[priority];
        this.logger.log(`Mapped Keycloak roles [${keycloakRoles.join(', ')}] to ${mappedRole}`);
        return mappedRole;
      }
    }

    this.logger.warn(`No recognized roles found in [${keycloakRoles.join(', ')}]`);
    return null;
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
   * Get user attributes (e.g., school, phoneNumber) from Keycloak
   */
  async getUserAttributes(userId: string): Promise<Record<string, any>> {
    try {
      await this.authenticate();
      const user = await this.kcAdminClient.users.findOne({ id: userId });
      return user?.attributes || {};
    } catch (error) {
      this.logger.error(`Failed to get user attributes from Keycloak: ${error.message}`);
      return {};
    }
  }

  /**
   * Update user details in Keycloak
   */
  async updateUser(userId: string, data: { firstName?: string; lastName?: string; school?: string; phoneNumber?: string }) {
    try {
      await this.authenticate();

      const updatePayload: any = {};

      if (data.firstName !== undefined) updatePayload.firstName = data.firstName;
      if (data.lastName !== undefined) updatePayload.lastName = data.lastName;

      // Handle attributes
      if (data.school !== undefined || data.phoneNumber !== undefined) {
        const user = await this.kcAdminClient.users.findOne({ id: userId });
        updatePayload.attributes = user?.attributes || {};

        if (data.school !== undefined) updatePayload.attributes.school = [data.school];
        if (data.phoneNumber !== undefined) updatePayload.attributes.phoneNumber = [data.phoneNumber];
      }

      if (Object.keys(updatePayload).length > 0) {
        await this.kcAdminClient.users.update({ id: userId }, updatePayload);
        this.logger.log(`Updated user '${userId}' in Keycloak`);
      }
    } catch (error) {
      this.logger.error(`Failed to update user in Keycloak: ${error.message}`);
    }
  }

  /**
   * Delete user from Keycloak
   */
  async deleteUser(userId: string) {
    try {
      await this.authenticate();
      await this.kcAdminClient.users.del({ id: userId });
      this.logger.log(`Deleted user '${userId}' from Keycloak`);
    } catch (error) {
      this.logger.error(`Failed to delete user from Keycloak: ${error.message}`);
    }
  }
}