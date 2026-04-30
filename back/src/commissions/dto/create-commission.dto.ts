import { IsString, IsNotEmpty, IsDateString, IsDecimal } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCommissionDto {
  @IsString() @IsNotEmpty() teacherId: string;

  @IsDecimal({ decimal_digits: '0,2' })
  @Type(() => String)
  percentage: string;

  @IsDateString() effectiveFrom: string;
}
