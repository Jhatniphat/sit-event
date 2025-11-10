import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { SessionData } from '../../auth/session.service';

export const SessionUser = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext): Promise<SessionData> => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const sessionData = (request as any).sessionData;

    if (!sessionData) {
      throw new UnauthorizedException('No valid session found');
    }

    return sessionData;
  },
);