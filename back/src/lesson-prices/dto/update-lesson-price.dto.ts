import { IsString, IsNumber, IsPositive, IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

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
}
