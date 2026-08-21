import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from './schemas/role.schema';
import { UsersModule } from '../users/users.module';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]),
    UsersModule,
  ],
  controllers: [RbacController],
  providers: [RbacService],
})
export class RbacModule {}
