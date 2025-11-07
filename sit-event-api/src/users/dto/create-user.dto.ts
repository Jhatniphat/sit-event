import { UserRole } from '../../common/enums/roles.enum';

export class CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  age?: number;
  school?: string;
  province?: string;
  dietaryRequirements?: string;
  userRole?: UserRole;
}
