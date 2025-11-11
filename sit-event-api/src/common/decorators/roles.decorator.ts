import { SetMetadata } from '@nestjs/common';
import { AnyRole, UserRole, } from '../enums/roles.enum';
import { ROLES_KEY, REQUIRE_ALL_ROLES_KEY } from '../guards/roles.guard';

/**
 * Decorator to specify required roles for accessing an endpoint
 * User must have ANY of the specified roles (or higher)
 * 
 * @example
 * @Roles(UserRole.ADMIN, UserRole.TEACHER)
 * @Get('admin-only')
 * adminOnlyEndpoint() { ... }
 */
export const Roles = (...roles: AnyRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Decorator to specify that user must have ALL of the required roles
 * Used in combination with @Roles
 * 
 * @example
 * @Roles(UserRole.TEACHER, EventRole.ORGANIZER)
 * @RequireAllRoles()
 * @Post('create-event')
 * createEvent() { ... }
 */
export const RequireAllRoles = () => SetMetadata(REQUIRE_ALL_ROLES_KEY, true);

/**
 * Pre-defined role combinations for common use cases
 */

// Admin-only access
export const AdminOnly = () => Roles(UserRole.ADMIN);

// Event organizer access
export const EventOrganizerAccess = () => Roles(UserRole.ADMIN, UserRole.ORGANIZER);

export const InternalStudent = () => Roles(UserRole.ADMIN, UserRole.INTERNAL_STUDENT);

export const ExternalStudent = () => Roles(UserRole.ADMIN, UserRole.EXTERNAL_STUDENT);

export const AllRoleAccess = () => Roles(
  UserRole.ADMIN,
  UserRole.ORGANIZER,
  UserRole.INTERNAL_STUDENT,
  UserRole.EXTERNAL_STUDENT
);