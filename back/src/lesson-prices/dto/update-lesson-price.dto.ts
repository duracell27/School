import { IsString, IsNumber, IsPositive, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { Subject } from '@prisma/client';

export class UpdateLessonPriceDto {
  @IsString()
  @IsOptional()
  childId?: string;

  @IsString()
  @IsOptional()
  teacherId?: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  @IsOptional()
  price?: number;

  @IsDateString()
  @IsOptional()
  effectiveDate?: string;

  @IsEnum(Subject)
  @IsOptional()
  subject?: Subject;
}
