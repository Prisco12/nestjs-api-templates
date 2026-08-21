import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission } from '../authorization/permission-catalog';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { SetPermissionsDto } from './dto/set-permissions.dto';
import { SetUserRolesDto } from './dto/set-user-roles.dto';
import { RbacService } from './rbac.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/domain/authenticated-user.interface';

@ApiTags('RBAC')
@ApiBearerAuth()
@Permissions(Permission.ROLES_MANAGE)
@Controller('rbac')
export class RbacController {
  constructor(private readonly rbac: RbacService) {}
  @Get('permissions') listPermissions() {
    return this.rbac.listPermissions();
  }
  @Get('roles') listRoles() {
    return this.rbac.listRoles();
  }
  @Post('roles') createRole(
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rbac.createRole(dto.name, dto.description, user.id);
  }
  @Put('roles/:name/permissions') setRolePermissions(
    @Param('name') name: string,
    @Body() dto: SetPermissionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rbac.setRolePermissions(name, dto.permissions, user.id);
  }
  @Put('users/:userId/roles') setUserRoles(
    @Param('userId') userId: string,
    @Body() dto: SetUserRolesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rbac.setUserRoles(userId, dto.roles, user.id);
  }
}
