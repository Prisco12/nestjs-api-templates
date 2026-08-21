import {
  ArrayUnique,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SetUserRolesDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(2, { each: true })
  @MaxLength(100, { each: true })
  roles!: string[];
}
