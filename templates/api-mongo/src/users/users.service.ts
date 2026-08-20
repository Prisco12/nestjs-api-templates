import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { Role as RoleSchema } from './schemas/role.schema';
import { Role } from '../authorization/access-control';
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(RoleSchema.name) private readonly roles: Model<RoleSchema>,
  ) {}

  async create(email: string, passwordHash: string) {
    const defaultRole = await this.roles.findOne({ name: Role.USER }).exec();
    if (!defaultRole) {
      throw new ServiceUnavailableException(
        'Default user role is unavailable. Run the database seed.',
      );
    }
    return this.users.create({
      email,
      passwordHash,
      roles: [defaultRole._id],
    });
  }

  findByEmailForAuth(email: string): Promise<any> {
    return this.users.findOne({ email }).populate('roles').exec();
  }
  async me(id: string) {
    const user = await this.users
      .findById(id)
      .select('email isActive createdAt')
      .lean();
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user._id.toString(),
      email: user.email,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
  async list(page: number, limit: number) {
    const users = await this.users
      .find()
      .select('email isActive createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return users.map((user) => ({
      id: user._id.toString(),
      email: user.email,
      isActive: user.isActive,
      createdAt: user.createdAt,
    }));
  }
}
