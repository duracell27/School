import { IsString, IsDateString, IsOptional } from 'class-validator';

export class PaymentQueryDto {
  @IsString() @IsOptional() teacherId?: string;
  @IsDateString() @IsOptional() from?: string;
  @IsDateString() @IsOptional() to?: string;
}
