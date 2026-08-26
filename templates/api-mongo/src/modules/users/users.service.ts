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
import { createPaginatedResult } from '../../common/types/pagination';
import { UserForAuthentication } from './domain/user-for-authentication';
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

  findByEmailForAuth(email: string): Promise<UserForAuthentication | null> {
    return this.users
      .findOne({ email })
      .populate<{ roles: UserForAuthentication['roles'] }>('roles')
      .lean<UserForAuthentication>()
      .exec();
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
  async rolesForAudit(id: string) {
    if (!isValidObjectId(id)) throw new NotFoundException('User not found');
    const user = await this.users
      .findById(id)
      .populate({ path: 'roles', select: 'name' })
      .select('roles')
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return {
      userId: user._id.toString(),
      roles: (user.roles as unknown as Array<{ name: string }>).map(
        (role) => role.name,
      ),
    };
  }
  findAccountTokenUser(id: string) {
    if (!isValidObjectId(id)) return null;
    return this.users.findById(id).exec();
  }
  setEmailVerificationToken(id: string, tokenHash: string, expiresAt: Date) {
    return this.users.updateOne(
      { _id: id },
      {
        emailVerificationTokenHash: tokenHash,
        emailVerificationTokenExpiresAt: expiresAt,
      },
    );
  }
  confirmEmail(id: string) {
    return this.users.updateOne(
      { _id: id },
      {
        $set: { emailVerifiedAt: new Date() },
        $unset: {
          emailVerificationTokenHash: 1,
          emailVerificationTokenExpiresAt: 1,
        },
      },
    );
  }
  setPasswordResetToken(id: string, tokenHash: string, expiresAt: Date) {
    return this.users.updateOne(
      { _id: id },
      {
        passwordResetTokenHash: tokenHash,
        passwordResetTokenExpiresAt: expiresAt,
      },
    );
  }
  resetPassword(id: string, passwordHash: string) {
    return this.users.updateOne(
      { _id: id },
      {
        $set: { passwordHash },
        $unset: { passwordResetTokenHash: 1, passwordResetTokenExpiresAt: 1 },
        $inc: { authorizationVersion: 1 },
      },
    );
  }
  async me(id: string) {
    const user = await this.users
      .findById(id)
      .select('email emailVerifiedAt isActive createdAt')
      .lean();
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user._id.toString(),
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt ?? null,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
  async list(page: number, limit: number) {
    const [users, totalItems] = await Promise.all([
      this.users
        .find()
        .select('email emailVerifiedAt isActive createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.users.countDocuments(),
    ]);
    return createPaginatedResult(
      users.map((user) => ({
        id: user._id.toString(),
        email: user.email,
        emailVerifiedAt: user.emailVerifiedAt ?? null,
        isActive: user.isActive,
        createdAt: user.createdAt,
      })),
      page,
      limit,
      totalItems,
    );
  }
}
