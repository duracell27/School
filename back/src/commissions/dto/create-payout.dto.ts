import { IsString, IsNotEmpty, IsOptional, IsDecimal } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePayoutDto {
  @IsString() @IsNotEmpty() teacherId: string;

  @IsDecimal({ decimal_digits: '0,2' })
  @Type(() => String)
  amount: string;

  @IsString() @IsOptional() notes?: string;
}
