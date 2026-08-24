import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { User } from './schemas/user.schema';
import { Role as RoleSchema } from '../rbac/schemas/role.schema';
import { DEFAULT_USER_ROLE } from '../authorization/permission-catalog';
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(RoleSchema.name) private readonly roles: Model<RoleSchema>,
  ) {}

  async create(email: string, passwordHash: string) {
    const defaultRole = await this.roles
      .findOne({ name: DEFAULT_USER_ROLE })
      .exec();
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
  async hasCurrentAuthorizationVersion(id: string, version: number) {
    const user = await this.users
      .findById(id)
      .select('isActive authorizationVersion')
      .lean();
    return (
      !!user && user.isActive && (user.authorizationVersion ?? 1) === version
    );
  }
  incrementAuthorizationVersionByRole(roleId: Types.ObjectId) {
    return this.users.updateMany(
      { roles: roleId },
      { $inc: { authorizationVersion: 1 } },
    );
  }
  async replaceRoles(id: string, roleIds: Types.ObjectId[]) {
    if (!isValidObjectId(id)) throw new NotFoundException('User not found');
    const user = await this.users.findByIdAndUpdate(
      id,
      {
        $set: { roles: roleIds },
        $inc: { authorizationVersion: 1 },
      },
      { returnDocument: 'after' },
    );
    if (!user) throw new NotFoundException('User not found');
    return user._id.toString();
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
