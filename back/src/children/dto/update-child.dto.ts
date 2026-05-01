import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  IsDateString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ParentContactDto } from './create-child.dto';

export class UpdateChildDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  age?: number;

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
  @IsOptional()
  timezone?: string;
}
