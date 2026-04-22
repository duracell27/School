import { IsString, IsNotEmpty, IsNumber, IsPositive, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

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
}
