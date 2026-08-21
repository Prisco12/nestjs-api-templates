import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { DEFAULT_USER_ROLE } from '../authorization/permission-catalog';
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  async create(email: string, passwordHash: string) {
    const defaultRole = await this.prisma.role.findUnique({
      where: { name: DEFAULT_USER_ROLE },
      select: { id: true },
    });
    if (!defaultRole) {
      throw new ServiceUnavailableException(
        'Default user role is unavailable. Run the database seed.',
      );
    }
    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        roles: { create: { roleId: defaultRole.id } },
      },
      select: { id: true, email: true },
    });
  }
  findByEmailForAuth(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });
  }
  async hasCurrentAuthorizationVersion(id: string, version: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { isActive: true, authorizationVersion: true },
    });
    return !!user && user.isActive && user.authorizationVersion === version;
  }
  incrementAuthorizationVersionByRoleId(roleId: string) {
    return this.prisma.user.updateMany({
      where: { roles: { some: { roleId } } },
      data: { authorizationVersion: { increment: 1 } },
    });
  }
  async replaceRoles(id: string, roleIds: string[]) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: id, roleId })),
      }),
      this.prisma.user.update({
        where: { id },
        data: { authorizationVersion: { increment: 1 } },
      }),
    ]);
    return id;
  }
  async me(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, isActive: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
  list(page: number, limit: number) {
    return this.prisma.user.findMany({
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, email: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
