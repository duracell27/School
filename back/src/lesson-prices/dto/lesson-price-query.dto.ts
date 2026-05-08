import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class LessonPriceQueryDto {
  @IsInt() @Min(1) @IsOptional() @Type(() => Number) page?: number;
  @IsInt() @Min(1) @IsOptional() @Type(() => Number) limit?: number;
}
