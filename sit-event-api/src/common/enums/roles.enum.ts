export enum UserRole {
  ADMIN = 'ADMIN',
  ORGANIZER = 'ORGANIZER',
  INTERNAL_STUDENT = 'INTERNAL_STUDENT',
  EXTERNAL_STUDENT = 'EXTERNAL_STUDENT',
}


// Combined roles for convenience
export const ALL_ROLES = {
  ...UserRole,
} as const;

export type AnyRole = UserRole;

// Role hierarchy for permission checking
export const ROLE_HIERARCHY = {
    [UserRole.ADMIN]: [UserRole.ORGANIZER, UserRole.INTERNAL_STUDENT, UserRole.EXTERNAL_STUDENT],
    [UserRole.ORGANIZER]: [UserRole.INTERNAL_STUDENT, UserRole.EXTERNAL_STUDENT],
    [UserRole.INTERNAL_STUDENT]: [UserRole.EXTERNAL_STUDENT],
};

// Helper functions for role checking
export const hasRole = (userRoles: string[], requiredRole: AnyRole): boolean => {
  return userRoles.includes(requiredRole);
};

export const hasAnyRole = (userRoles: string[], requiredRoles: AnyRole[]): boolean => {
  return requiredRoles.some(role => userRoles.includes(role));
};

export const hasHigherOrEqualRole = (userRoles: string[], requiredRole: AnyRole): boolean => {
  // Check if user has the exact role
  if (hasRole(userRoles, requiredRole)) {
    return true;
  }
  
  // Check if user has a higher role that includes the required role
  for (const userRole of userRoles) {
    const allowedRoles = ROLE_HIERARCHY[userRole as AnyRole];
    if (allowedRoles && allowedRoles.includes(requiredRole)) {
      return true;
    }
  }
  
  return false;
};