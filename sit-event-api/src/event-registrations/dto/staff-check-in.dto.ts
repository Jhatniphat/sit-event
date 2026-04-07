import { IsUUID, IsOptional, IsNotEmpty } from 'class-validator';

/**
 * DTO for Staff Check-in Request
 * 
 * Used by Staff to check-in a User into an Event or specific Session.
 * Authorization requires Staff to have CHECK_IN permission with matching scope.
 */
export class StaffCheckInDto {
  /**
   * UUID of the User to check-in
   */
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  /**
   * [Optional] UUID of the Session to check-in to.
   * - If provided: Staff must have CHECK_IN permission scoped to this session
   * - If null/undefined: Check-in to main event (Staff must have event-wide scope with sessionId=null)
   */
  @IsOptional()
  @IsUUID()
  sessionId?: string | null;
}
