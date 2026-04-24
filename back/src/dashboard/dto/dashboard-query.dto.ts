import { IsEnum, IsOptional } from 'class-validator';

export type Period = 'week' | 'month' | 'year';

export class DashboardQueryDto {
  @IsEnum(['week', 'month', 'year'])
  @IsOptional()
  period: Period = 'month';
}
