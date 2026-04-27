import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LessonQueryDto } from './dto/lesson-query.dto';

const lessonSelectBase = {
  id: true,
  child: { select: { id: true, name: true, avatar: true, timezone: true, country: true } },
  teacher: { select: { id: true, name: true, avatar: true } },
  status: true,
  startDate: true,
  endDate: true,
  price: true,
  originalStartDate: true,
  originalEndDate: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LessonSelect;

const lessonSelectWithPayments = {
  ...lessonSelectBase,
  paymentLessons: { select: { amount: true, type: true } },
} satisfies Prisma.LessonSelect;

function computePaymentStatus(lesson: {
  status: string;
  price: unknown;
  paymentLessons: Array<{ amount: unknown; type: string }>;
}): 'PAID' | 'UNPAID' | 'PREPAID' | null {
  if (lesson.status === 'CONDUCTED') {
    const covered = lesson.paymentLessons.reduce((sum, pl) => sum + Number(pl.amount), 0);
    return covered >= Number(lesson.price) ? 'PAID' : 'UNPAID';
  }
  if (lesson.status === 'PLANNED') {
    return lesson.paymentLessons.some(pl => pl.type === 'PREPAID') ? 'PREPAID' : null;
  }
  return null;
}

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

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

    if (userRole === Role.ADMIN) {
      return this.prisma.lesson.findMany({
        where,
        select: lessonSelectWithPayments,
        orderBy: { startDate: 'asc' },
      }).then(lessons =>
        lessons.map(l => ({
          ...l,
          paymentStatus: computePaymentStatus(l),
          paymentLessons: undefined,
        }))
      );
    }

    return this.prisma.lesson.findMany({
      where,
      select: lessonSelectBase,
      orderBy: { startDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      select: lessonSelectBase,
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

  async getOverdueCount(userId: string, userRole: Role): Promise<number> {
    const where: Prisma.LessonWhereInput = {
      status: 'PLANNED',
      endDate: { lt: new Date() },
    };
    if (userRole === Role.TEACHER) {
      where.teacherId = userId;
    }
    return this.prisma.lesson.count({ where });
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
    const lesson = await this.prisma.lesson.create({
      data: {
        ...rest,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        ...(originalStartDate ? { originalStartDate: new Date(originalStartDate) } : {}),
        ...(originalEndDate ? { originalEndDate: new Date(originalEndDate) } : {}),
      },
      select: lessonSelectBase,
    });
    await this.payments.reallocate(dto.childId, dto.teacherId);
    return lesson;
  }

  async update(id: string, dto: UpdateLessonDto, userId: string, userRole: Role) {
    const lesson = await this.findOne(id);

    if (userRole === Role.TEACHER && lesson.teacher.id !== userId) {
      throw new ForbiddenException('You can only edit your own lessons');
    }

    const { startDate, endDate, originalStartDate, originalEndDate, ...rest } = dto;
    const updated = await this.prisma.lesson.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate !== undefined ? { startDate: new Date(startDate) } : {}),
        ...(endDate !== undefined ? { endDate: new Date(endDate) } : {}),
        ...(originalStartDate !== undefined ? { originalStartDate: new Date(originalStartDate) } : {}),
        ...(originalEndDate !== undefined ? { originalEndDate: new Date(originalEndDate) } : {}),
      },
      select: lessonSelectBase,
    });
    await this.payments.reallocate(lesson.child.id, lesson.teacher.id);
    return updated;
  }

  async remove(id: string, userId: string, userRole: Role): Promise<void> {
    const lesson = await this.findOne(id);

    if (userRole === Role.TEACHER && lesson.teacher.id !== userId) {
      throw new ForbiddenException('You can only delete your own lessons');
    }

    await this.prisma.lesson.delete({ where: { id } });
    await this.payments.reallocate(lesson.child.id, lesson.teacher.id);
  }
}
