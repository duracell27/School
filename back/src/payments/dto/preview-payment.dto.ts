import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PreviewPaymentDto {
  @IsString() @IsNotEmpty() childId: string;
  @IsString() @IsNotEmpty() teacherId: string;

  @IsNumber() @Min(0)
  @Type(() => Number)
  amount: number;

  @IsString() @IsOptional() excludePaymentId?: string;
}
