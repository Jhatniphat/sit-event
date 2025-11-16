import { Controller, Get, Query, Res, HttpStatus, Logger, Req, UnauthorizedException } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { Public } from 'nest-keycloak-connect';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { LoginCallbackResponseDto, SessionValidationResponseDto } from './dto/session.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

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
  async callback(@Query('code') code: string, @Query('error') error: string, @Res() res: Response): Promise<void> {
    try {
      if (!code) {
        this.logger.error('No authorization code received');
        res.status(HttpStatus.BAD_REQUEST).json({
          message: 'No authorization code received',
        });
        return;
      }

      this.logger.log(`Processing callback with code: ${code.substring(0, 10)}...`);
      
      const result = await this.authService.handleCallback(code);
      
      // Create session and get signed cookie
      const { sessionId, cookieValue } = await this.sessionService.createSession(
        result.user,
        result.tokens,
      );

      // Set session cookie
      res.cookie('session', cookieValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
        path: '/',
      });

      this.logger.log(`User authenticated and session created: ${result.user.email}`);

      // Return success response
      const response: LoginCallbackResponseDto = {
        message: 'Authentication successful',
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          userRole: result.user.userRole,
        },
        sessionCreated: true,
      };

      res.status(HttpStatus.OK).json(response);

    } catch (error) {
      this.logger.error('Callback processing error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Authentication callback failed',
        error: error.message,
      });
    }
  }

  @Public()
  @Get('session')
  async getSession(@Req() req: Request): Promise<SessionValidationResponseDto> {
    try {
      const sessionCookie = req.cookies?.session;
      
      if (!sessionCookie) {
        throw new UnauthorizedException('No session cookie found');
      }

      const sessionData = await this.sessionService.validateSessionFromCookie(sessionCookie);
      
      if (!sessionData) {
        throw new UnauthorizedException('Invalid or expired session');
      }
      
      this.logger.log(`Session validated for user: ${sessionData.email}`);
      
      return {
        valid: true,
        session: {
          sessionId: sessionData.sessionId,
          userId: sessionData.userId,
          email: sessionData.email,
          firstName: sessionData.firstName,
          lastName: sessionData.lastName,
          userRole: sessionData.userRole,
          accessToken: sessionData.accessToken,
          refreshToken: sessionData.refreshToken,
          expiresIn: sessionData.expiresIn,
          tokenType: sessionData.tokenType,
          createdAt: sessionData.createdAt,
          expiresAt: sessionData.expiresAt,
        },
        message: 'Session is valid',
      };

    } catch (error) {
      this.logger.error('Session validation failed:', error);
      
      if (error instanceof UnauthorizedException) {
        return {
          valid: false,
          message: error.message,
        };
      }

      return {
        valid: false,
        message: 'Session validation failed',
      };
    }
  }

  @Public()
  @Get('logout')
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    try {
      const sessionCookie = req.cookies?.session;
      let idTokenHint: string | null = null;

      // Clear session from Redis if cookie exists and retrieve idToken for id_token_hint
      if (sessionCookie) {
        try {
          idTokenHint = await this.sessionService.logout(sessionCookie as string);
        } catch (err) {
          this.logger.warn('Failed to read session idToken during logout:', err?.message || err);
        }
      }

      // Clear the session cookie
      res.clearCookie('session', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      // Get Keycloak logout URL (include id_token_hint if available) and redirect
      const logoutUrl = this.authService.getLogoutUrl(idTokenHint || undefined);
      this.logger.log(`User logged out and redirecting to: ${logoutUrl}`);

      res.status(HttpStatus.FOUND).redirect(logoutUrl);
      
    } catch (error) {
      this.logger.error('Logout error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Logout failed',
        error: error.message,
      });
    }
  }

  @Public()
  @Get('logout-url')
  async getLogoutUrl(@Req() req: Request) {
    try {
      // If there's an active session cookie, include id_token_hint (without deleting session)
      const sessionCookie = req.cookies?.session;
      let idTokenHint: string | undefined;

      if (sessionCookie) {
        try {
          const sessionData = await this.sessionService.validateSessionFromCookie(sessionCookie as string);
          if (sessionData?.idToken) {
            idTokenHint = sessionData.idToken;
          }
        } catch {
          // ignore - we still return the logout URL without hint
          this.logger.debug('No valid session for logout-url id_token_hint');
        }
      }

      const logoutUrl = this.authService.getLogoutUrl(idTokenHint);
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