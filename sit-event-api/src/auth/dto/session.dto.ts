export class SessionResponseDto {
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
  tokenCreatedAt: Date;
}

export class LoginCallbackResponseDto {
  message: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    userRole: string;
  };
  sessionCreated: boolean;
}

export class SessionValidationResponseDto {
  valid: boolean;
  session?: SessionResponseDto;
  message: string;
}