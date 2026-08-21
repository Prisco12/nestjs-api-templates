import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { AuthenticatedUser } from '../auth/domain/authenticated-user.interface';
import { UsersService } from './users.service';
import { Permission } from '../authorization/permission-catalog';
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get('me') me(@CurrentUser() user: AuthenticatedUser) {
    return this.users.me(user.id);
  }
  @Permissions(Permission.USERS_READ) @Get() list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.users.list(
      Math.max(1, page),
      Math.min(100, Math.max(1, limit)),
    );
  }
}
