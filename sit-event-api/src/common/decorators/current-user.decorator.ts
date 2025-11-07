import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export interface AuthenticatedUser {
  sub: string;
  email: string;
  preferred_username: string;
  given_name: string;
  family_name: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [clientId: string]: {
      roles: string[];
    };
  };
}