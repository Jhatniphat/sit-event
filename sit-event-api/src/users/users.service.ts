import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma.service';
import { AuthenticatedUser } from '../common';
import { KeycloakAdminService } from '../auth/keycloak-admin.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => KeycloakAdminService))
    private keycloakAdminService: KeycloakAdminService
  ) { }

  async createUser(userData: CreateUserDto) {
    return this.prisma.user.create({
      data: userData,
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async getProfile(keycloakUser: AuthenticatedUser) {
    // ดึงข้อมูลจาก database โดยใช้ email
    const dbUser = await this.prisma.user.findUnique({
      where: { email: keycloakUser.email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        school: true,
        roleInSchool: true,
        province: true,
      },
    });

    if (!dbUser) {
      throw new NotFoundException('User not found in database');
    }
    return dbUser;
  }

  async updateMyProfile(keycloakUser: AuthenticatedUser, updateData: UpdateUserDto) {
    const user = await this.getProfile(keycloakUser);

    // Update inside Keycloak Admin
    await this.keycloakAdminService.updateUser(keycloakUser.sub, {
      firstName: updateData.firstName,
      lastName: updateData.lastName,
      school: updateData.school,
      phoneNumber: updateData.phoneNumber,
    });

    return this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });
  }

  async deleteMyProfile(keycloakUser: AuthenticatedUser) {
    const user = await this.getProfile(keycloakUser);

    // Delete inside Keycloak Admin
    await this.keycloakAdminService.deleteUser(keycloakUser.sub);

    return this.prisma.user.delete({
      where: { id: user.id },
    });
  }

  async updateUser(id: string, userData: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: userData,
    });
  }

  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  findAll() {
    return `This action returns all users`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
