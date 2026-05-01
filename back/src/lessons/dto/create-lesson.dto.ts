import {
  IsString, IsNotEmpty, IsNumber, IsPositive,
  IsDateString, IsEnum, IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LessonStatus, Subject } from '@prisma/client';

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty()
  childId: string;

  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @IsEnum(LessonStatus)
  @IsOptional()
  status?: LessonStatus;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price: number;

  @IsEnum(Subject)
  @IsOptional()
  subject?: Subject;

  @IsDateString()
  @IsOptional()
  originalStartDate?: string;

  @IsDateString()
  @IsOptional()
  originalEndDate?: string;
}
