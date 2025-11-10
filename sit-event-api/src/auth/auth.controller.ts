import { Controller, Get, Query, Res, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from 'nest-keycloak-connect';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('login')
  login(@Res() res: Response) {
    try {
      const loginUrl = this.authService.getLoginUrl();
      this.logger.log(`Redirecting to Keycloak login: ${loginUrl}`);
      
      return res.status(HttpStatus.FOUND).redirect(loginUrl);
    } catch (error) {
      this.logger.error('Error getting login URL:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to get login URL',
        error: error.message,
      });
    }
  }

  @Public()
  @Get('login-url')
  getLoginUrl() {
    try {
      const loginUrl = this.authService.getLoginUrl();
      this.logger.log(`Generated login URL: ${loginUrl}`);
      
      return {
        loginUrl,
        message: 'Login URL generated successfully',
      };
    } catch (error) {
      this.logger.error('Error getting login URL:', error);
      return {
        message: 'Failed to get login URL',
        error: error.message,
      };
    }
  }

  @Public()
  @Get('callback')
  async callback(@Query('code') code: string, @Query('error') error: string, @Res() res: Response) {
    try {
      // if (error) {
      //   this.logger.error(`Keycloak callback error: ${error}`);
      //   return res.status(HttpStatus.BAD_REQUEST).json({
      //     message: 'Authentication failed',
      //     error,
      //   });
      // }

      if (!code) {
        this.logger.error('No authorization code received');
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'No authorization code received',
        });
      }

      this.logger.log(`Processing callback with code: ${code.substring(0, 10)}...`);
      
      const result = await this.authService.handleCallback(code);
      
      this.logger.log(`User authenticated successfully: ${result.user.email}`);

      // You can redirect to frontend with tokens or return JSON
      // For now, returning JSON response
      return res.status(HttpStatus.OK).json({
        message: 'Authentication successful',
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
        },
        tokens: {
          accessToken: result.tokens.access_token,
          refreshToken: result.tokens.refresh_token,
          tokenType: result.tokens.token_type,
          expiresIn: result.tokens.expires_in,
        },
      });

    } catch (error) {
      this.logger.error('Callback processing error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Authentication callback failed',
        error: error.message,
      });
    }
  }

  @Public()
  @Get('logout')
  logout(@Res() res: Response) {
    try {
      const logoutUrl = this.authService.getLogoutUrl();
      this.logger.log(`Redirecting to Keycloak logout: ${logoutUrl}`);
      
      return res.status(HttpStatus.FOUND).redirect(logoutUrl);
    } catch (error) {
      this.logger.error('Error getting logout URL:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to get logout URL',
        error: error.message,
      });
    }
  }

  @Public()
  @Get('logout-url')
  getLogoutUrl() {
    try {
      const logoutUrl = this.authService.getLogoutUrl();
      this.logger.log(`Generated logout URL: ${logoutUrl}`);
      
      return {
        logoutUrl,
        message: 'Logout URL generated successfully',
      };
    } catch (error) {
      this.logger.error('Error getting logout URL:', error);
      return {
        message: 'Failed to get logout URL',
        error: error.message,
      };
    }
  }

  @Get('me')
  getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    return {
      user: {
        id: user.sub,
        email: user.email,
        username: user.preferred_username,
        firstName: user.given_name,
        lastName: user.family_name,
        roles: user.realm_access?.roles || [],
      },
      message: 'Current user information',
    };
  }
}