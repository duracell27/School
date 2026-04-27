import { IsString, IsDecimal, IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePaymentDto {
  @IsDecimal({ decimal_digits: '0,2' }) @IsOptional()
  @Type(() => String)
  amount?: string;

  @IsDateString() @IsOptional() date?: string;

  @IsString() @IsOptional() notes?: string;
}
