import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CopyWeekDto {
  @IsDateString()
  targetWeekStart: string;

  @IsString()
  @IsOptional()
  teacherId?: string;
}
