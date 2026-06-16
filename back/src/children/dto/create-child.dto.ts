import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  IsNotEmpty,
  IsDateString,
  Min,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ChildStatus } from '@prisma/client';

export class ParentContactDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class CreateChildDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  age: number;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsDateString()
  @IsOptional()
  hireDate?: string;

  @IsDateString()
  @IsOptional()
  graduationDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParentContactDto)
  @IsOptional()
  parentContacts?: ParentContactDto[];

  @IsString()
  @IsNotEmpty()
  timezone: string;

  @IsEnum(ChildStatus)
  @IsOptional()
  status?: ChildStatus;
}
