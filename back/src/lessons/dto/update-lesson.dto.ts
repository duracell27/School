import {
  IsString, IsNumber, IsPositive,
  IsDateString, IsEnum, IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LessonStatus } from '@prisma/client';

export class UpdateLessonDto {
  @IsString()
  @IsOptional()
  childId?: string;

  @IsString()
  @IsOptional()
  teacherId?: string;

  @IsEnum(LessonStatus)
  @IsOptional()
  status?: LessonStatus;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  @IsOptional()
  price?: number;

  @IsDateString()
  @IsOptional()
  originalStartDate?: string;

  @IsDateString()
  @IsOptional()
  originalEndDate?: string;
}
