import { Injectable } from '@nestjs/common';

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

export function getPeriodRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  if (period === 'week') {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const start = new Date(now);
    start.setDate(now.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
  }
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end };
  }
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear() + 1, 0, 1);
  return { start, end };
}

export function getPrevPeriodRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  if (period === 'week') {
    const { start } = getPeriodRange('week');
    const prevEnd = new Date(start);
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 7);
    return { start: prevStart, end: prevEnd };
  }
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end };
  }
  const start = new Date(now.getFullYear() - 1, 0, 1);
  const end = new Date(now.getFullYear(), 0, 1);
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
    return Array.from({ length: numWeeks }, (_, i) => emptyPoint(`Тиж. ${i + 1}`));
  }
  return UA_MONTHS.map((m) => emptyPoint(m));
}

export function getLessonGroupKey(lessonDate: Date, period: Period): string {
  if (period === 'week') {
    return lessonDate.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
  }
  if (period === 'month') {
    return `Тиж. ${Math.ceil(lessonDate.getDate() / 7)}`;
  }
  return UA_MONTHS[lessonDate.getMonth()];
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}
}
