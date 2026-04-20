import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Role, EmploymentStatus } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(Role)
  role: Role;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsEnum(EmploymentStatus)
  @IsOptional()
  status?: EmploymentStatus;

  @IsDateString()
  @IsOptional()
  hireDate?: string;

  @IsDateString()
  @IsOptional()
  terminationDate?: string;
}
