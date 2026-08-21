import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-z][a-z0-9_-]*$/)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
