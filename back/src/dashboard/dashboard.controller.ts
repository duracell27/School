import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

interface JwtUser { sub: string; role: Role; }

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('next-lesson')
  getNextLesson(@Req() req: Request) {
    const user = req['user'] as JwtUser;
    return this.dashboard.getNextLesson(user.sub, user.role);
  }

  @Get('summary')
  getSummary(@Query() query: DashboardQueryDto, @Req() req: Request) {
    const user = req['user'] as JwtUser;
    const ref = query.date ? new Date(query.date) : new Date();
    return this.dashboard.getSummary(user.sub, user.role, query.period, ref);
  }

  @Get('chart')
  getChart(@Query() query: DashboardQueryDto, @Req() req: Request) {
    const user = req['user'] as JwtUser;
    const ref = query.date ? new Date(query.date) : new Date();
    return this.dashboard.getChart(user.sub, user.role, query.period, ref);
  }

  @Get('children-stats')
  getChildrenStats(@Req() req: Request) {
    const user = req['user'] as JwtUser;
    return this.dashboard.getChildrenStats(user.sub, user.role);
  }

  @Get('teachers')
  @Roles(Role.ADMIN)
  getTeachers(@Query() query: DashboardQueryDto) {
    const ref = query.date ? new Date(query.date) : new Date();
    return this.dashboard.getTeachers(query.period, ref);
  }
}
