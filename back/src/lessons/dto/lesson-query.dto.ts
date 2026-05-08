import { IsString, IsDateString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
