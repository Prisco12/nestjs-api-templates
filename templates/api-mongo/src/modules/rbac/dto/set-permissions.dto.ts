import { ArrayUnique, IsArray, IsIn } from 'class-validator';
import { Permission } from '../../authorization/permission-catalog';

export class SetPermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsIn(Object.values(Permission), { each: true })
  permissions!: string[];
}
