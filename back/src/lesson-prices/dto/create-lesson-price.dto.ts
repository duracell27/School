import { IsString, IsNotEmpty, IsNumber, IsPositive, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { Subject } from '@prisma/client';

export class CreateLessonPriceDto {
  @IsString()
  @IsNotEmpty()
  childId: string;

  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price: number;

  @IsDateString()
  effectiveDate: string;

  @IsEnum(Subject)
  @IsOptional()
  subject?: Subject;
}
