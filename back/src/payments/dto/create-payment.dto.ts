import { IsString, IsNotEmpty, IsDecimal, IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @IsString() @IsNotEmpty() childId: string;
  @IsString() @IsNotEmpty() teacherId: string;

  @IsDecimal({ decimal_digits: '0,2' })
  @Type(() => String)
  amount: string;

  @IsDateString() date: string;

  @IsString() @IsOptional() notes?: string;
}
