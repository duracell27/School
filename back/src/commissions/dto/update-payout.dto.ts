import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class UpdatePayoutDto {
  @IsOptional()
  @IsNumberString()
  amount?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
