import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission } from '../authorization/permission-catalog';
import { UsersService } from '../users/users.service';
import { Role } from './schemas/role.schema';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit.types';

@Injectable()
export class RbacService {
  constructor(
    @InjectModel(Role.name) private readonly roles: Model<Role>,
    private readonly users: UsersService,
    private readonly audit: AuditService,
  ) {}

  async listRoles() {
    const roles = await this.roles.find().sort({ name: 1 }).lean();
    return roles.map((role) => ({
      name: role.name,
      description: role.description ?? null,
      permissions: role.permissions,
    }));
  }

  listPermissions() {
    return Object.values(Permission).map((code) => ({ code }));
  }

  async createRole(
    name: string,
    description: string | undefined,
    actorId: string,
  ) {
    try {
      const role = await this.roles.create({
        name,
        description,
        permissions: [],
      });
      const result = { name: role.name, description: role.description ?? null };
      await this.audit.record({
        actorId,
        action: AuditAction.RBAC_ROLE_CREATED,
        resource: 'roles',
        resourceId: role._id.toString(),
        status: 'SUCCESS',
        after: result,
      });
      return result;
    } catch (error: any) {
      if (error?.code === 11000)
        throw new ConflictException('Role already exists');
      throw error;
    }
  }

  async setRolePermissions(
    name: string,
    permissions: string[],
    actorId: string,
  ) {
    const role = await this.roles.findOneAndUpdate(
      { name },
      { $set: { permissions } },
      { returnDocument: 'after' },
    );
    if (!role) throw new NotFoundException('Role not found');
    await this.users.incrementAuthorizationVersionByRole(role._id);
    const result = { name: role.name, permissions: role.permissions };
    await this.audit.record({
      actorId,
      action: AuditAction.RBAC_ROLE_PERMISSIONS_UPDATED,
      resource: 'roles',
      resourceId: role._id.toString(),
      status: 'SUCCESS',
      after: result,
    });
    return result;
  }

  async setUserRoles(userId: string, roleNames: string[], actorId: string) {
    const roles = await this.roles.find({ name: { $in: roleNames } }).exec();
    if (roles.length !== roleNames.length)
      throw new NotFoundException('One or more roles were not found');
    const id = await this.users.replaceRoles(
      userId,
      roles.map((role) => role._id),
    );
    const result = { userId: id, roles: roleNames };
    await this.audit.record({
      actorId,
      action: AuditAction.RBAC_USER_ROLES_UPDATED,
      resource: 'users',
      resourceId: id,
      status: 'SUCCESS',
      after: result,
    });
    return result;
  }
}
