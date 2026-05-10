import { IsString, IsDateString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaymentQueryDto {
  @IsString() @IsOptional() teacherId?: string;
  @IsString() @IsOptional() childId?: string;
  @IsDateString() @IsOptional() from?: string;
  @IsDateString() @IsOptional() to?: string;

  @IsInt() @Min(1) @IsOptional() @Type(() => Number) page?: number;
  @IsInt() @Min(1) @IsOptional() @Type(() => Number) limit?: number;
}
