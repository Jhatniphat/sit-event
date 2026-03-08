import { IsEmail, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../common/enums/roles.enum';
import { RoleInSchool } from '../../../generated/prisma';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsInt()
  @IsOptional()
  age?: number;

  @IsString()
  @IsOptional()
  school?: string;

  @IsEnum(RoleInSchool)
  @IsOptional()
  roleInSchool?: RoleInSchool;

  @IsString()
  @IsOptional()
  province?: string;

  @IsString()
  @IsOptional()
  dietaryRequirements?: string;

  @IsEnum(UserRole)
  @IsOptional()
  userRole?: UserRole;
}
