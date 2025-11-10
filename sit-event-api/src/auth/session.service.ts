import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export interface SessionData {
  sessionId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  userRole: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface CookieSession {
  sessionId: string;
  signature: string;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private redisClient: RedisClientType;
  private readonly sessionTTL = 24 * 60 * 60; // 24 hours in seconds
  private readonly sessionSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.sessionSecret = this.configService.get('SESSION_SECRET') || 'default-session-secret-change-me';
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      const redisUrl = this.configService.get('REDIS_URL') || 'redis://localhost:6379';
      
      this.redisClient = createClient({
        url: redisUrl,
      });

      this.redisClient.on('error', (err) => {
        this.logger.error('Redis client error:', err);
      });

      this.redisClient.on('connect', () => {
        this.logger.log('Connected to Redis successfully');
      });

      this.redisClient.on('ready', () => {
        this.logger.log('Redis client ready');
      });

      this.redisClient.on('end', () => {
        this.logger.log('Redis connection ended');
      });

      await this.redisClient.connect();
      this.logger.log('Redis client initialized and connected');
    } catch (error) {
      this.logger.error('Failed to initialize Redis client:', error);
      throw error;
    }
  }

  /**
   * Create a new session and store in Redis
   */
  async createSession(
    user: any,
    tokens: any,
  ): Promise<{ sessionId: string; cookieValue: string }> {
    try {
      const sessionId = uuidv4();
      const expiresAt = new Date(Date.now() + this.sessionTTL * 1000);

      const sessionData: SessionData = {
        sessionId,
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userRole: user.userRole,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        tokenType: tokens.token_type,
        createdAt: new Date(),
        expiresAt,
      };

      // Store session data in Redis with TTL
      const sessionKey = `session:${sessionId}`;
      await this.redisClient.setEx(
        sessionKey,
        this.sessionTTL,
        JSON.stringify(sessionData),
      );

      // Create signed cookie value
      const cookieValue = this.createSignedCookie(sessionId);

      this.logger.log(`Session created for user: ${user.email} with ID: ${sessionId}`);
      
      return { sessionId, cookieValue };
    } catch (error) {
      this.logger.error('Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Get session data from Redis by session ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const sessionKey = `session:${sessionId}`;
      const sessionDataString = await this.redisClient.get(sessionKey);

      if (!sessionDataString) {
        this.logger.warn(`Session not found: ${sessionId}`);
        return null;
      }

      const sessionData: SessionData = JSON.parse(sessionDataString);

      // Check if session is expired
      if (new Date() > new Date(sessionData.expiresAt)) {
        this.logger.warn(`Session expired: ${sessionId}`);
        await this.deleteSession(sessionId);
        return null;
      }

      // Extend session TTL on access
      await this.redisClient.expire(sessionKey, this.sessionTTL);

      this.logger.log(`Session retrieved for user: ${sessionData.email}`);
      return sessionData;
    } catch (error) {
      this.logger.error('Failed to get session:', error);
      return null;
    }
  }

  /**
   * Validate session from cookie and return session data
   */
  async validateSessionFromCookie(cookieValue: string): Promise<SessionData | null> {
    try {
      if (!cookieValue) {
        throw new UnauthorizedException('No session cookie provided');
      }

      // Parse and verify signed cookie
      const sessionId = this.verifySignedCookie(cookieValue);
      
      if (!sessionId) {
        throw new UnauthorizedException('Invalid session cookie signature');
      }

      // Get session data from Redis
      const sessionData = await this.getSession(sessionId);
      
      if (!sessionData) {
        throw new UnauthorizedException('Session not found or expired');
      }

      return sessionData;
    } catch (error) {
      this.logger.error('Session validation failed:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid session');
    }
  }

  /**
   * Delete session from Redis
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const sessionKey = `session:${sessionId}`;
      await this.redisClient.del(sessionKey);
      this.logger.log(`Session deleted: ${sessionId}`);
    } catch (error) {
      this.logger.error('Failed to delete session:', error);
      throw error;
    }
  }

  /**
   * Delete session by cookie value
   */
  async logout(cookieValue: string): Promise<void> {
    try {
      const sessionId = this.verifySignedCookie(cookieValue);
      if (sessionId) {
        await this.deleteSession(sessionId);
      }
    } catch (error) {
      this.logger.error('Failed to logout session:', error);
      // Don't throw error for logout, just log it
    }
  }

  /**
   * Update tokens in existing session
   */
  async updateSessionTokens(
    sessionId: string,
    tokens: any,
  ): Promise<void> {
    try {
      const sessionData = await this.getSession(sessionId);
      if (!sessionData) {
        throw new Error('Session not found');
      }

      // Update tokens
      sessionData.accessToken = tokens.access_token;
      sessionData.refreshToken = tokens.refresh_token;
      sessionData.expiresIn = tokens.expires_in;
      sessionData.tokenType = tokens.token_type;

      // Save updated session
      const sessionKey = `session:${sessionId}`;
      await this.redisClient.setEx(
        sessionKey,
        this.sessionTTL,
        JSON.stringify(sessionData),
      );

      this.logger.log(`Session tokens updated: ${sessionId}`);
    } catch (error) {
      this.logger.error('Failed to update session tokens:', error);
      throw error;
    }
  }

  /**
   * Get all active sessions for a user (for debugging/admin purposes)
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      const keys = await this.redisClient.keys('session:*');
      const sessions: SessionData[] = [];

      for (const key of keys) {
        const sessionDataString = await this.redisClient.get(key);
        if (sessionDataString) {
          const sessionData: SessionData = JSON.parse(sessionDataString);
          if (sessionData.userId === userId) {
            sessions.push(sessionData);
          }
        }
      }

      return sessions;
    } catch (error) {
      this.logger.error('Failed to get user sessions:', error);
      return [];
    }
  }

  /**
   * Create a signed cookie value
   */
  private createSignedCookie(sessionId: string): string {
    const signature = this.signData(sessionId);
    const cookieData: CookieSession = { sessionId, signature };
    return Buffer.from(JSON.stringify(cookieData)).toString('base64');
  }

  /**
   * Verify signed cookie and return session ID
   */
  private verifySignedCookie(cookieValue: string): string | null {
    try {
      const cookieDataString = Buffer.from(cookieValue, 'base64').toString('utf-8');
      const cookieData: CookieSession = JSON.parse(cookieDataString);

      const expectedSignature = this.signData(cookieData.sessionId);
      
      if (cookieData.signature === expectedSignature) {
        return cookieData.sessionId;
      }

      this.logger.warn('Cookie signature verification failed');
      return null;
    } catch (error) {
      this.logger.error('Failed to verify signed cookie:', error);
      return null;
    }
  }

  /**
   * Sign data using HMAC
   */
  private signData(data: string): string {
    return crypto
      .createHmac('sha256', this.sessionSecret)
      .update(data)
      .digest('hex');
  }

  /**
   * Clean up expired sessions (can be called periodically)
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const keys = await this.redisClient.keys('session:*');
      let cleanedCount = 0;

      for (const key of keys) {
        const sessionDataString = await this.redisClient.get(key);
        if (sessionDataString) {
          const sessionData: SessionData = JSON.parse(sessionDataString);
          if (new Date() > new Date(sessionData.expiresAt)) {
            await this.redisClient.del(key);
            cleanedCount++;
          }
        }
      }

      this.logger.log(`Cleaned up ${cleanedCount} expired sessions`);
    } catch (error) {
      this.logger.error('Failed to cleanup expired sessions:', error);
    }
  }

  async onModuleDestroy() {
    try {
      if (this.redisClient) {
        await this.redisClient.quit();
        this.logger.log('Redis client disconnected');
      }
    } catch (error) {
      this.logger.error('Error disconnecting Redis client:', error);
    }
  }
}