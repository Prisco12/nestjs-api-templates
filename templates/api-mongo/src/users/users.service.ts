import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly users: Model<User>) {}

  create(email: string, passwordHash: string) {
    return this.users.create({ email, passwordHash });
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
      .select('email isActive createdAt roles')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return users.map((user) => ({
      id: user._id.toString(),
      email: user.email,
      roles: user.roles,
      isActive: user.isActive,
      createdAt: user.createdAt,
    }));
  }

  async returnAll() {
    const users = await this.users.find
  }
}
