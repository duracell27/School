import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertLessonNoteDto } from './dto/upsert-lesson-note.dto';

@Injectable()
export class LessonNotesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(dto: UpsertLessonNoteDto, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: dto.lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    return this.prisma.lessonNote.upsert({
      where: { lessonId: dto.lessonId },
      create: {
        lessonId: dto.lessonId,
        description: dto.description,
        imageData: dto.imageData,
        createdById: userId,
      },
      update: {
        description: dto.description,
        imageData: dto.imageData,
      },
      select: {
        id: true,
        lessonId: true,
        description: true,
        imageData: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByLesson(lessonId: string) {
    const note = await this.prisma.lessonNote.findUnique({
      where: { lessonId },
      select: {
        id: true,
        lessonId: true,
        description: true,
        imageData: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { id: true, name: true } },
      },
    });
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }
}
