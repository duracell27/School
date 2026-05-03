import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService, computeAllocation } from '../payments/payments.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LessonQueryDto } from './dto/lesson-query.dto';

const lessonSelectBase = {
  id: true,
  child: { select: { id: true, name: true, avatar: true, timezone: true, country: true } },
  teacher: { select: { id: true, name: true, avatar: true } },
  status: true,
  subject: true,
  startDate: true,
  endDate: true,
  price: true,
  originalStartDate: true,
  originalEndDate: true,
  note: { select: { id: true } },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LessonSelect;

const lessonSelectWithPayments = {
  ...lessonSelectBase,
  paymentLessons: { select: { amount: true, type: true } },
} satisfies Prisma.LessonSelect;

const isAdminRole = (role: Role) => role === Role.ADMIN || role === Role.ADMIN_TEACHER;

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

    if (isAdminRole(userRole)) {
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
    subject?: string,
  ): Promise<number | null> {
    const lp = await this.prisma.lessonPrice.findFirst({
      where: {
        childId,
        teacherId,
        ...(subject ? { subject: subject as import('@prisma/client').Subject } : {}),
        effectiveDate: { lte: new Date(startDate) },
      },
      orderBy: { effectiveDate: 'desc' },
    });
    return lp ? Number(lp.price) : null;
  }

  async getChildBalances() {
    // Derive (child, teacher) pairs from subject assignments
    const childSubjects = await this.prisma.childSubject.findMany({
      select: {
        childId: true,
        teacherId: true,
        child: { select: { id: true, name: true, avatar: true, country: true } },
        teacher: { select: { id: true, name: true, avatar: true } },
      },
    });

    const pairKey = (cId: string, tId: string) => `${cId}:${tId}`;
    const pairInfoMap = new Map<string, {
      childId: string; teacherId: string;
      child: { id: string; name: string; avatar: string | null };
      teacher: { id: string; name: string; avatar: string | null };
    }>();
    for (const cs of childSubjects) {
      const key = pairKey(cs.childId, cs.teacherId);
      if (!pairInfoMap.has(key)) pairInfoMap.set(key, cs);
    }

    if (pairInfoMap.size === 0) return [];

    const pairs = Array.from(pairInfoMap.values());
    const childIds = [...new Set(pairs.map(p => p.childId))];

    const [payments, lessons, lessonPrices] = await Promise.all([
      this.prisma.payment.findMany({
        where: { childId: { in: childIds } },
        orderBy: { date: 'asc' },
        select: { id: true, childId: true, teacherId: true, amount: true },
      }),
      this.prisma.lesson.findMany({
        where: { childId: { in: childIds }, status: { in: ['CONDUCTED', 'PLANNED'] } },
        orderBy: { startDate: 'asc' },
        select: { id: true, childId: true, teacherId: true, price: true, status: true },
      }),
      this.prisma.lessonPrice.findMany({
        where: { childId: { in: childIds } },
        orderBy: { effectiveDate: 'desc' },
        select: { childId: true, teacherId: true, price: true },
      }),
    ]);

    const priceByPair = new Map<string, number>();
    for (const lp of lessonPrices) {
      const key = pairKey(lp.childId, lp.teacherId);
      if (!priceByPair.has(key)) priceByPair.set(key, Number(lp.price));
    }

    const paymentsByPair = new Map<string, Array<{ id: string; amount: number }>>();
    for (const p of payments) {
      const key = pairKey(p.childId, p.teacherId);
      if (!paymentsByPair.has(key)) paymentsByPair.set(key, []);
      paymentsByPair.get(key)!.push({ id: p.id, amount: Number(p.amount) });
    }

    const lessonsByPair = new Map<string, Array<{ id: string; price: number; status: 'CONDUCTED' | 'PLANNED' }>>();
    for (const l of lessons) {
      const key = pairKey(l.childId, l.teacherId);
      if (!lessonsByPair.has(key)) lessonsByPair.set(key, []);
      lessonsByPair.get(key)!.push({ id: l.id, price: Number(l.price), status: l.status as 'CONDUCTED' | 'PLANNED' });
    }

    return pairs.map(({ child, teacher, childId: cId, teacherId: tId }) => {
      const key = pairKey(cId, tId);
      const pairPayments = paymentsByPair.get(key) ?? [];
      const pairLessons = lessonsByPair.get(key) ?? [];

      const records = computeAllocation(pairPayments, pairLessons);

      const lessonDebt = new Map<string, number>();
      const lessonPrepaid = new Map<string, number>();
      for (const r of records) {
        if (r.type === 'DEBT') lessonDebt.set(r.lessonId, (lessonDebt.get(r.lessonId) ?? 0) + r.amount);
        else lessonPrepaid.set(r.lessonId, (lessonPrepaid.get(r.lessonId) ?? 0) + r.amount);
      }

      let totalDebtUah = 0;
      let prepaidCount = 0;
      for (const lesson of pairLessons) {
        if (lesson.status === 'CONDUCTED') {
          const paid = lessonDebt.get(lesson.id) ?? 0;
          if (paid < lesson.price) {
            totalDebtUah = Math.round((totalDebtUah + lesson.price - paid) * 100) / 100;
          }
        }
        if (lesson.status === 'PLANNED' && (lessonPrepaid.get(lesson.id) ?? 0) > 0) prepaidCount++;
      }

      const totalPaid = pairPayments.reduce((s, p) => s + p.amount, 0);
      const totalAllocated = records.reduce((s, r) => s + r.amount, 0);
      const leftover = Math.round((totalPaid - totalAllocated) * 100) / 100;

      const lessonPrice = priceByPair.get(key)
        ?? (pairLessons.length > 0 ? pairLessons[pairLessons.length - 1].price : undefined);

      const round = (n: number) => Math.round(n * 100) / 100;
      const floorLessons = (uah: number) =>
        lessonPrice && lessonPrice > 0
          ? Math.floor(Math.round(uah * 100) / Math.round(lessonPrice * 100))
          : 0;

      let debtCount = 0;
      let debtUah = 0;
      if (totalDebtUah > 0) {
        debtCount = floorLessons(totalDebtUah);
        debtUah = lessonPrice ? round(totalDebtUah - debtCount * lessonPrice) : totalDebtUah;
      }

      let leftoverUah = 0;
      if (leftover > 0) {
        const virtualLessons = floorLessons(leftover);
        prepaidCount += virtualLessons;
        leftoverUah = lessonPrice ? round(leftover - virtualLessons * lessonPrice) : leftover;
      }

      return { child, teacher, debtCount, debtUah, prepaidCount, leftoverUah };
    });
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
        select: { subjects: { select: { teacherId: true } } },
      });
      if (!child) throw new NotFoundException('Child not found');
      if (!child.subjects.some((s) => s.teacherId === userId)) {
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
