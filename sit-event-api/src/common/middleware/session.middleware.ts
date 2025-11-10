import { Injectable, NestMiddleware, Logger, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../../auth/session.service';

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SessionMiddleware.name);

  constructor(private readonly sessionService: SessionService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionCookie = req.cookies?.session;
      
      if (sessionCookie) {
        const sessionData = await this.sessionService.validateSessionFromCookie(sessionCookie);
        
        if (sessionData) {
          // Attach session data to request
          (req as any).sessionData = sessionData;
          this.logger.debug(`Session validated for user: ${sessionData.email}`);
        }
      }
      
      next();
    } catch (error) {
      this.logger.warn('Session validation failed:', error.message);
      // Don't throw error, just continue without session
      next();
    }
  }
}