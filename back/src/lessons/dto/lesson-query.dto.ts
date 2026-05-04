import { IsString, IsDateString, IsOptional } from 'class-validator';

export class LessonQueryDto {
  @IsString()
  @IsOptional()
  teacherId?: string;

  @IsDateString()
  @IsOptional()
  weekStart?: string;

  @IsDateString()
  @IsOptional()
  date?: string;
}
