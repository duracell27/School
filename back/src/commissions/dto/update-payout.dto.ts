import { IsString, IsOptional, IsDecimal, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePayoutDto {
  @IsDecimal({ decimal_digits: '0,2' })
  @Type(() => String)
  @IsOptional()
  amount?: string;

  @IsString() @IsOptional() notes?: string;

  @IsDateString() @IsOptional() paidAt?: string;
}
