import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { UserRole } from '../common/enums/roles.enum';
import { KeycloakAdminService } from './keycloak-admin.service';
import axios from 'axios';
import * as https from 'https';

export interface KeycloakUser {
  sub: string;
  email_verified: boolean;
  name: string;
  preferred_username: string;
  given_name: string;
  family_name: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly httpsAgent = new https.Agent({
    rejectUnauthorized: false, // Ignore self-signed certificates
  });

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly keycloakAdminService: KeycloakAdminService,
  ) {}

  getLoginUrl(): string {
    const authServerUrl = this.configService.get('KC_AUTH_SERVER_URL');
    const realm = this.configService.get('KC_REALM');
    const clientId = this.configService.get('KC_CLIENT_ID');
    const redirectUri = this.configService.get('KC_REDIRECT_URI');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
    });

    const loginUrl = `${authServerUrl}/realms/${realm}/protocol/openid-connect/auth?${params.toString()}`;
    this.logger.log(`Generated login URL with redirect_uri: ${redirectUri}`);
    
    return loginUrl;
  }

  async handleCallback(code: string): Promise<any> {
    try {
      this.logger.log(`Starting callback process with code: ${code.substring(0, 10)}...`);
      
      // Exchange code for tokens
      let tokenResponse = await this.exchangeCodeForTokens(code);
      
      // Get user info from Keycloak
      const userInfo = await this.getUserInfo(tokenResponse.access_token);
      
      
      // Create or update user in our database
      const result = await this.createOrUpdateUser(userInfo);

      // If user was newly created (role was just assigned), refresh token to get updated roles
      if (result.isNewUser) {
        this.logger.log(`New user created, refreshing token to include role: ${result.user.userRole}`);
        try {
          // Wait a moment for Keycloak to process the role assignment
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Refresh the token to get the updated roles
          tokenResponse = await this.refreshAccessToken(tokenResponse.refresh_token);
          this.logger.log('Token refreshed successfully with new roles');
        } catch (refreshError) {
          this.logger.warn(`Failed to refresh token after role assignment: ${refreshError.message}`);
          // Continue anyway - user can re-login if needed
        }
      }

      this.logger.log(`Callback completed successfully for user: ${userInfo.email}`);

      return {
        user: result.user,
        tokens: tokenResponse,
      };
    } catch (error) {
      this.logger.error('Error handling callback:', {
        message: error.message,
        stack: error.stack,
        code: code?.substring(0, 10),
      });
      throw error;
    }
  }

  private async exchangeCodeForTokens(code: string): Promise<any> {
    const authServerUrl = this.configService.get('KC_AUTH_SERVER_URL');
    const realm = this.configService.get('KC_REALM');
    const clientId = this.configService.get('KC_CLIENT_ID');
    const clientSecret = this.configService.get('KC_CLIENT_SECRET');
    const redirectUri = this.configService.get('KC_REDIRECT_URI') || 'http://localhost:3000/auth/callback';

    const tokenUrl = `${authServerUrl}/realms/${realm}/protocol/openid-connect/token`;
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    try {
      this.logger.log(`Making token request to: ${tokenUrl}`);
      this.logger.log(`With redirect_uri: ${redirectUri}`);
      
      const response = await axios.post(tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000, // 10 second timeout
        httpsAgent: this.httpsAgent, // Use HTTPS agent that ignores self-signed certs
      });

      this.logger.log('Token exchange successful');
      return response.data;
    } catch (error) {
      this.logger.error('Token exchange failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: tokenUrl,
      });
      throw new Error(`Token exchange failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  private async getUserInfo(accessToken: string): Promise<KeycloakUser> {
    const authServerUrl = this.configService.get('KC_AUTH_SERVER_URL');
    const realm = this.configService.get('KC_REALM');

    const userInfoUrl = `${authServerUrl}/realms/${realm}/protocol/openid-connect/userinfo`;

    try {
      this.logger.log(`Getting user info from: ${userInfoUrl}`);
      
      const response = await axios.get(userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 10000,
        httpsAgent: this.httpsAgent, // Use HTTPS agent that ignores self-signed certs
      });

      this.logger.log('User info retrieved successfully');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get user info:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: userInfoUrl,
      });
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }

  private async createOrUpdateUser(keycloakUser: KeycloakUser) {
    // Check if user exists
    const existingUser = await this.usersService.findByEmail(keycloakUser.email);
    
    if (existingUser) {
      // For existing users, get their role from Keycloak
      this.logger.log(`Updating existing user: ${keycloakUser.email}`);
      
      try {
        // Get role from Keycloak
        const keycloakRole = await this.keycloakAdminService.getUserRole(keycloakUser.sub);
        
        // If user has a role in Keycloak, sync it to database
        if (keycloakRole) {
          this.logger.log(`Syncing role ${keycloakRole} from Keycloak to database for user: ${keycloakUser.email}`);
          
          const user = await this.usersService.updateUser(existingUser.id, {
            firstName: keycloakUser.given_name,
            lastName: keycloakUser.family_name,
            email: keycloakUser.email,
            userRole: keycloakRole, // Update role from Keycloak
          });
          
          return { user, isNewUser: false };
        } else {
          // No role in Keycloak, preserve existing database role and sync it to Keycloak
          this.logger.log(`No role found in Keycloak, syncing database role to Keycloak for user: ${keycloakUser.email}`);
          
          if (existingUser.userRole) {
            await this.keycloakAdminService.assignRoleToUser(
              keycloakUser.sub, 
              existingUser.userRole
            );
          }
          
          const user = await this.usersService.updateUser(existingUser.id, {
            firstName: keycloakUser.given_name,
            lastName: keycloakUser.family_name,
            email: keycloakUser.email,
          });
          
          return { user, isNewUser: false };
        }
      } catch (error) {
        this.logger.error(`Failed to sync role for user ${keycloakUser.email}: ${error.message}`);
        
        // Fallback: just update basic user info
        const user = await this.usersService.updateUser(existingUser.id, {
          firstName: keycloakUser.given_name,
          lastName: keycloakUser.family_name,
          email: keycloakUser.email,
        });
        
        return { user, isNewUser: false };
      }
    } else {
      // For new users, try to get existing role from Keycloak first
      let roleToUse: UserRole | null = null;
      let shouldAssignRoleToKeycloak = false;
      
      try {
        const keycloakRole = await this.keycloakAdminService.getUserRole(keycloakUser.sub
        );
        if (keycloakRole) {
           this.logger.log(`Found existing role ${keycloakRole} in Keycloak for new user ${keycloakUser.email}`);
           roleToUse = keycloakRole;
        }
      } catch (error) {
         this.logger.warn(`Failed to check existing Keycloak role for new user: ${error.message}`);
      }
      
      // If no role found in Keycloak, determine based on email
      if (!roleToUse) {
        roleToUse = this.determineUserRole(keycloakUser.email);
        shouldAssignRoleToKeycloak = true;
        this.logger.log(`No existing role found. Determined initial role: ${roleToUse} for ${keycloakUser.email}`);
      }

      this.logger.log(`Creating new user: ${keycloakUser.email} with role: ${roleToUse}`);
      
      // Assign initial role to Keycloak if it wasn't there
      if (shouldAssignRoleToKeycloak) {
        await this.keycloakAdminService.assignRoleToUser(keycloakUser.sub, roleToUse);
      }

      // Create new user with role
      const user = await this.usersService.createUser({
        email: keycloakUser.email,
        firstName: keycloakUser.given_name,
        lastName: keycloakUser.family_name,
        userRole: roleToUse,
      });
      
      return { user, isNewUser: true };
    }
  }

  private determineUserRole(email: string): UserRole {
    // Extract domain part after @
    const domain = email.split('@')[1]?.toLowerCase();
    
    // Check if domain contains "kmutt"
    if (domain && domain.includes('kmutt')) {
      this.logger.log(`Email ${email} contains 'kmutt' domain, assigning INTERNAL_STUDENT role`);
      return UserRole.INTERNAL_STUDENT;
    } else {
      this.logger.log(`Email ${email} does not contain 'kmutt' domain, assigning EXTERNAL_STUDENT role`);
      return UserRole.EXTERNAL_STUDENT;
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<any> {
    const authServerUrl = this.configService.get('KC_AUTH_SERVER_URL');
    const realm = this.configService.get('KC_REALM');
    const clientId = this.configService.get('KC_CLIENT_ID');
    const clientSecret = this.configService.get('KC_CLIENT_SECRET');

    const tokenUrl = `${authServerUrl}/realms/${realm}/protocol/openid-connect/token`;
    
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });

    try {
      this.logger.log('Refreshing access token');
      
      const response = await axios.post(tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
        httpsAgent: this.httpsAgent,
      });

      this.logger.log('Token refresh successful');
      return response.data;
    } catch (error) {
      this.logger.error('Token refresh failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw new Error(`Token refresh failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  getLogoutUrl(idTokenHint?: string): string {
    const authServerUrl = this.configService.get('KC_AUTH_SERVER_URL');
    const realm = this.configService.get('KC_REALM');
    const clientId = this.configService.get('KC_CLIENT_ID');
    const redirectUri = this.configService.get('KC_LOGOUT_REDIRECT_URI') || 'http://localhost:3000/auth/logout-callback';

    const params = new URLSearchParams({
      client_id: clientId,
      post_logout_redirect_uri: redirectUri,
    });

    // Add id_token_hint only if available
    if (idTokenHint) {
      params.append('id_token_hint', idTokenHint);
      this.logger.log('Logout URL generated with id_token_hint');
    } else {
      this.logger.warn('Logout URL generated without id_token_hint (session may not have been found)');
    }

    const logoutUrl = `${authServerUrl}/realms/${realm}/protocol/openid-connect/logout?${params.toString()}`;
    this.logger.log(`Generated logout URL with client_id and post_logout_redirect_uri`);
    
    return logoutUrl;
  }
}