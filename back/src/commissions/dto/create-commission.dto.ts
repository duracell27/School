import { IsString, IsNotEmpty, IsDateString, IsDecimal, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCommissionDto {
  @IsString() @IsNotEmpty() teacherId: string;

  @IsDecimal({ decimal_digits: '0,2' })
  @Matches(/^(100(\.0{1,2})?|[0-9]{1,2}(\.[0-9]{1,2})?)$/, {
    message: 'percentage must be between 0 and 100',
  })
  @Type(() => String)
  percentage: string;

  @IsDateString() effectiveFrom: string;
}
