import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Role } from '../authorization/access-control';
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  async create(email: string, passwordHash: string) {
    const defaultRole = await this.prisma.role.findUnique({
      where: { name: Role.USER },
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
