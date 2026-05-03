import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, Req, UseGuards, HttpCode,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LessonQueryDto } from './dto/lesson-query.dto';
import { CopyWeekDto } from './dto/copy-week.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface JwtUser {
  sub: string;
  role: Role;
}

@Controller('lessons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER)
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  @Get()
  findAll(@Query() query: LessonQueryDto, @Req() req: Request) {
    const user = req['user'] as JwtUser;
    return this.lessons.findAll(user.sub, user.role, query);
  }

  @Get('overdue-count')
  getOverdueCount(@Req() req: Request) {
    const user = req['user'] as JwtUser;
    return this.lessons.getOverdueCount(user.sub, user.role);
  }

  @Get('child-balances')
  @Roles(Role.ADMIN)
  getChildBalances() {
    return this.lessons.getChildBalances();
  }

  // Defined before :id to avoid routing conflict
  @Get('price-suggestion')
  getPriceSuggestion(
    @Query('childId') childId: string,
    @Query('teacherId') teacherId: string,
    @Query('startDate') startDate: string,
    @Query('subject') subject?: string,
  ) {
    return this.lessons.getPriceSuggestion(childId, teacherId, startDate, subject);
  }

  @Post()
  create(@Body() dto: CreateLessonDto, @Req() req: Request) {
    const user = req['user'] as JwtUser;
    return this.lessons.create(dto, user.sub, user.role);
  }

  @Post('copy-from-prev-week')
  copyFromPrevWeek(@Body() dto: CopyWeekDto, @Req() req: Request) {
    const user = req['user'] as JwtUser;
    return this.lessons.copyFromPrevWeek(user.sub, user.role, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lessons.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLessonDto, @Req() req: Request) {
    const user = req['user'] as JwtUser;
    return this.lessons.update(id, dto, user.sub, user.role);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @Req() req: Request) {
    const user = req['user'] as JwtUser;
    return this.lessons.remove(id, user.sub, user.role);
  }
}
