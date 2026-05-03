import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { Period } from './dto/dashboard-query.dto';

export interface ChartPoint {
  label: string;
  conducted: number;
  cancelled: number;
  planned: number;
  rescheduled: number;
}

function emptyPoint(label: string): ChartPoint {
  return { label, conducted: 0, cancelled: 0, planned: 0, rescheduled: 0 };
}

const UA_MONTHS = ['Січ', 'Лют', 'Бер', 'Квіт', 'Трав', 'Черв', 'Лип', 'Серп', 'Вер', 'Жовт', 'Лист', 'Груд'];
const UA_MONTHS_SHORT = ['січ', 'лют', 'бер', 'квіт', 'трав', 'черв', 'лип', 'серп', 'вер', 'жовт', 'лист', 'груд'];

function monthWeekLabel(weekNum: number, month: number, year: number): string {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = (weekNum - 1) * 7 + 1;
  const endDay = Math.min(weekNum * 7, daysInMonth);
  return `${startDay}-${endDay} ${UA_MONTHS_SHORT[month]}`;
}

export function getPeriodRange(period: Period, ref: Date = new Date()): { start: Date; end: Date } {
  if (period === 'week') {
    const day = ref.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const start = new Date(ref);
    start.setDate(ref.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
  }
  if (period === 'month') {
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
    return { start, end };
  }
  const start = new Date(ref.getFullYear(), 0, 1);
  const end = new Date(ref.getFullYear() + 1, 0, 1);
  return { start, end };
}

export function getPrevPeriodRange(period: Period, ref: Date = new Date()): { start: Date; end: Date } {
  if (period === 'week') {
    const { start } = getPeriodRange('week', ref);
    const prevEnd = new Date(start);
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 7);
    return { start: prevStart, end: prevEnd };
  }
  if (period === 'month') {
    const start = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
    const end = new Date(ref.getFullYear(), ref.getMonth(), 1);
    return { start, end };
  }
  const start = new Date(ref.getFullYear() - 1, 0, 1);
  const end = new Date(ref.getFullYear(), 0, 1);
  return { start, end };
}

export function buildChartSkeleton(period: Period, periodStart: Date): ChartPoint[] {
  if (period === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(periodStart);
      d.setDate(periodStart.getDate() + i);
      const label = d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
      return emptyPoint(label);
    });
  }
  if (period === 'month') {
    const daysInMonth = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0).getDate();
    const numWeeks = Math.ceil(daysInMonth / 7);
    return Array.from({ length: numWeeks }, (_, i) =>
      emptyPoint(monthWeekLabel(i + 1, periodStart.getMonth(), periodStart.getFullYear())),
    );
  }
  return UA_MONTHS.map((m) => emptyPoint(m));
}

export function getLessonGroupKey(lessonDate: Date, period: Period): string {
  if (period === 'week') {
    return lessonDate.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
  }
  if (period === 'month') {
    const weekNum = Math.ceil(lessonDate.getDate() / 7);
    return monthWeekLabel(weekNum, lessonDate.getMonth(), lessonDate.getFullYear());
  }
  return UA_MONTHS[lessonDate.getMonth()];
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getNextLesson(userId: string, userRole: Role) {
    const now = new Date();
    const where: Prisma.LessonWhereInput = {
      status: 'PLANNED',
      endDate: { gte: now },
    };
    if (userRole === Role.TEACHER) {
      where.teacherId = userId;
    }
    return this.prisma.lesson.findFirst({
      where,
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        child: { select: { id: true, name: true, avatar: true } },
        teacher: { select: { id: true, name: true } },
      },
    });
  }

  async getSummary(userId: string, userRole: Role, period: Period, ref: Date = new Date()) {
    const { start, end } = getPeriodRange(period, ref);
    const { start: prevStart, end: prevEnd } = getPrevPeriodRange(period, ref);
    const now = new Date();
    const teacherFilter = userRole === Role.TEACHER ? { teacherId: userId } : {};

    const [conducted, planned, prevConducted, payouts] = await Promise.all([
      this.prisma.lesson.aggregate({
        where: { ...teacherFilter, status: 'CONDUCTED', startDate: { gte: start, lt: end } },
        _sum: { price: true },
        _count: { id: true },
      }),
      this.prisma.lesson.aggregate({
        where: { ...teacherFilter, status: 'PLANNED', startDate: { gte: now, lt: end } },
        _sum: { price: true },
      }),
      this.prisma.lesson.aggregate({
        where: { ...teacherFilter, status: 'CONDUCTED', startDate: { gte: prevStart, lt: prevEnd } },
        _sum: { price: true },
      }),
      userRole !== Role.TEACHER
        ? this.prisma.teacherPayout.aggregate({
            where: { createdAt: { gte: start, lt: end } },
            _sum: { amount: true },
          })
        : Promise.resolve({ _sum: { amount: null } }),
    ]);

    const earned = Number(conducted._sum.price ?? 0);
    const expected = Number(planned._sum.price ?? 0);
    const prevEarned = Number(prevConducted._sum.price ?? 0);
    const payoutsTotal = Number(payouts._sum.amount ?? 0);
    const earnedDelta = prevEarned === 0
      ? null
      : Math.round(((earned - prevEarned) / prevEarned) * 100);

    return {
      earned,
      expected,
      earnedDelta,
      conductedCount: conducted._count.id,
      payoutsTotal,
      netProfit: Math.round((earned - payoutsTotal) * 100) / 100,
    };
  }

  async getChart(userId: string, userRole: Role, period: Period, ref: Date = new Date()): Promise<ChartPoint[]> {
    const { start, end } = getPeriodRange(period, ref);
    const where: Prisma.LessonWhereInput = { startDate: { gte: start, lt: end } };
    if (userRole === Role.TEACHER) where.teacherId = userId;

    const lessons = await this.prisma.lesson.findMany({
      where,
      select: { startDate: true, status: true },
    });

    const skeleton = buildChartSkeleton(period, start);

    const statusMap: Record<string, keyof Omit<ChartPoint, 'label'>> = {
      CONDUCTED: 'conducted',
      CANCELLED: 'cancelled',
      PLANNED: 'planned',
      RESCHEDULED: 'rescheduled',
    };

    for (const lesson of lessons) {
      const key = getLessonGroupKey(new Date(lesson.startDate), period);
      const point = skeleton.find((p) => p.label === key);
      if (point) {
        const field = statusMap[lesson.status];
        if (field) point[field]++;
      }
    }

    return skeleton;
  }

  async getChildrenStats(userId: string, userRole: Role) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const subjectFilter: Prisma.ChildWhereInput = userRole === Role.TEACHER
      ? { subjects: { some: { teacherId: userId } } }
      : {};

    const activeWhere: Prisma.ChildWhereInput = {
      ...subjectFilter,
      OR: [{ graduationDate: null }, { graduationDate: { gt: now } }],
    };

    const [active, newThisMonth, byCountryRaw] = await Promise.all([
      this.prisma.child.count({ where: activeWhere }),
      this.prisma.child.count({
        where: { ...subjectFilter, hireDate: { gte: monthStart } },
      }),
      this.prisma.child.groupBy({
        by: ['country'],
        where: activeWhere,
        _count: { country: true },
        orderBy: { _count: { country: 'desc' } },
      }),
    ]);

    return {
      active,
      newThisMonth,
      byCountry: byCountryRaw.map((r) => ({ country: r.country, count: r._count.country })),
    };
  }

  async getTeachers(period: Period, ref: Date = new Date()) {
    const { start, end } = getPeriodRange(period, ref);
    const now = new Date();

    const teachers = await this.prisma.user.findMany({
      where: { role: { in: [Role.TEACHER, Role.ADMIN, Role.ADMIN_TEACHER] }, status: 'WORKING' },
      select: {
        id: true,
        name: true,
        avatar: true,
        childSubjectsTeaching: {
          where: {
            child: { OR: [{ graduationDate: null }, { graduationDate: { gt: now } }] },
          },
          select: { childId: true },
        },
        lessons: {
          where: { startDate: { gte: start, lt: end } },
          select: { status: true, price: true, startDate: true },
        },
      },
    });

    return teachers
      .map((t) => ({
        id: t.id,
        name: t.name,
        avatar: t.avatar,
        lessonsCount: t.lessons.length,
        earned: t.lessons
          .filter((l) => l.status === 'CONDUCTED')
          .reduce((sum, l) => sum + Number(l.price), 0),
        expected: t.lessons
          .filter((l) => l.status === 'PLANNED' && new Date(l.startDate) >= now)
          .reduce((sum, l) => sum + Number(l.price), 0),
        childrenCount: new Set(t.childSubjectsTeaching.map((cs) => cs.childId)).size,
      }))
      .sort((a, b) => b.lessonsCount - a.lessonsCount);
  }
}
