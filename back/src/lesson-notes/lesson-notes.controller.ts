import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { LessonNotesService } from './lesson-notes.service';
import { UpsertLessonNoteDto } from './dto/upsert-lesson-note.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface JwtUser {
  sub: string;
  role: Role;
}

@Controller('lesson-notes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER, Role.ADMIN_TEACHER)
export class LessonNotesController {
  constructor(private readonly service: LessonNotesService) {}

  @Post()
  upsert(@Body() dto: UpsertLessonNoteDto, @Req() req: Request) {
    const user = req['user'] as JwtUser;
    return this.service.upsert(dto, user.sub);
  }

  @Get(':lessonId')
  findByLesson(@Param('lessonId') lessonId: string) {
    return this.service.findByLesson(lessonId);
  }
}
