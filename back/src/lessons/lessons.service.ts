import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LessonQueryDto } from './dto/lesson-query.dto';

const lessonSelect = {
  id: true,
  child: { select: { id: true, name: true } },
  teacher: { select: { id: true, name: true } },
  status: true,
  startDate: true,
  endDate: true,
  price: true,
  originalStartDate: true,
  originalEndDate: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LessonSelect;

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string, userRole: Role, query: LessonQueryDto) {
    const { teacherId, weekStart } = query;
    const where: Prisma.LessonWhereInput = {};

    if (userRole === Role.TEACHER) {
      where.teacherId = userId;
    } else if (teacherId) {
      where.teacherId = teacherId;
    }

    if (weekStart) {
      const start = new Date(weekStart);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      where.startDate = { gte: start, lt: end };
    }

    return this.prisma.lesson.findMany({
      where,
      select: lessonSelect,
      orderBy: { startDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      select: lessonSelect,
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    return lesson;
  }

  async getPriceSuggestion(
    childId: string,
    teacherId: string,
    startDate: string,
  ): Promise<number | null> {
    const lp = await this.prisma.lessonPrice.findFirst({
      where: {
        childId,
        teacherId,
        effectiveDate: { lte: new Date(startDate) },
      },
      orderBy: { effectiveDate: 'desc' },
    });
    return lp ? Number(lp.price) : null;
  }

  async create(dto: CreateLessonDto, userId: string, userRole: Role) {
    if (userRole === Role.TEACHER) {
      const child = await this.prisma.child.findUnique({
        where: { id: dto.childId },
        select: { teacherId: true },
      });
      if (!child) throw new NotFoundException('Child not found');
      if (child.teacherId !== userId) {
        throw new ForbiddenException(
          'You can only create lessons for your assigned students',
        );
      }
    }

    const { startDate, endDate, originalStartDate, originalEndDate, ...rest } = dto;
    return this.prisma.lesson.create({
      data: {
        ...rest,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        ...(originalStartDate ? { originalStartDate: new Date(originalStartDate) } : {}),
        ...(originalEndDate ? { originalEndDate: new Date(originalEndDate) } : {}),
      },
      select: lessonSelect,
    });
  }

  async update(id: string, dto: UpdateLessonDto, userId: string, userRole: Role) {
    const lesson = await this.findOne(id);

    if (userRole === Role.TEACHER && lesson.teacher.id !== userId) {
      throw new ForbiddenException('You can only edit your own lessons');
    }

    const { startDate, endDate, originalStartDate, originalEndDate, ...rest } = dto;
    return this.prisma.lesson.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate !== undefined ? { startDate: new Date(startDate) } : {}),
        ...(endDate !== undefined ? { endDate: new Date(endDate) } : {}),
        ...(originalStartDate !== undefined ? { originalStartDate: new Date(originalStartDate) } : {}),
        ...(originalEndDate !== undefined ? { originalEndDate: new Date(originalEndDate) } : {}),
      },
      select: lessonSelect,
    });
  }

  async remove(id: string, userId: string, userRole: Role): Promise<void> {
    const lesson = await this.findOne(id);

    if (userRole === Role.TEACHER && lesson.teacher.id !== userId) {
      throw new ForbiddenException('You can only delete your own lessons');
    }

    await this.prisma.lesson.delete({ where: { id } });
  }
}
