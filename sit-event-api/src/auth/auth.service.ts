import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { UserRole } from '../common/enums/roles.enum';
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
      const tokenResponse = await this.exchangeCodeForTokens(code);
      
      // Get user info from Keycloak
      const userInfo = await this.getUserInfo(tokenResponse.access_token);
      
      
      // Create or update user in our database
      const user = await this.createOrUpdateUser(userInfo);

      this.logger.log(`Callback completed successfully for user: ${userInfo.email}`);

      return {
        user,
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
      // Update existing user but preserve their current role
      this.logger.log(`Updating existing user: ${keycloakUser.email}, preserving role: ${existingUser.userRole}`);
      return this.usersService.updateUser(existingUser.id, {
        firstName: keycloakUser.given_name,
        lastName: keycloakUser.family_name,
        email: keycloakUser.email,
        // Do not update userRole - preserve existing role
      });
    } else {
      // Determine user role based on email domain only for new users
      const userRole = this.determineUserRole(keycloakUser.email);
      this.logger.log(`Creating new user: ${keycloakUser.email} with role: ${userRole}`);
      
      // Create new user
      return this.usersService.createUser({
        email: keycloakUser.email,
        firstName: keycloakUser.given_name,
        lastName: keycloakUser.family_name,
        userRole: userRole,
      });
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