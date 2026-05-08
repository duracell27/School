import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentLessonType, SchoolTransactionReason, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { PreviewPaymentDto } from './dto/preview-payment.dto';

export interface AllocationRecord {
  paymentId: string;
  lessonId: string;
  amount: number;
  type: 'DEBT' | 'PREPAID';
}

export function computeAllocation(
  payments: Array<{ id: string; amount: number }>,
  lessons: Array<{ id: string; price: number; status: 'CONDUCTED' | 'PLANNED' }>,
): AllocationRecord[] {
  const records: AllocationRecord[] = [];
  const queue = lessons.map(l => ({ id: l.id, status: l.status, remaining: l.price }));
  let qi = 0;

  for (const payment of payments) {
    let rem = payment.amount;

    while (rem > 0 && qi < queue.length) {
      const lesson = queue[qi];
      const toApply = Math.min(rem, lesson.remaining);

      records.push({
        paymentId: payment.id,
        lessonId: lesson.id,
        amount: Math.round(toApply * 100) / 100,
        type: lesson.status === 'CONDUCTED' ? 'DEBT' : 'PREPAID',
      });

      rem = Math.round((rem - toApply) * 100) / 100;
      lesson.remaining = Math.round((lesson.remaining - toApply) * 100) / 100;

      if (lesson.remaining === 0) qi++;
      else break;
    }
  }

  return records;
}

const paymentSelect = {
  id: true,
  child: { select: { id: true, name: true, avatar: true, country: true } },
  teacher: { select: { id: true, name: true, avatar: true } },
  amount: true,
  date: true,
  notes: true,
  createdBy: { select: { id: true, name: true } },
  lessons: {
    select: {
      lessonId: true,
      amount: true,
      type: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PaymentSelect;

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchoolBalance(): Promise<number> {
    const result = await this.prisma.schoolTransaction.aggregate({ _sum: { amount: true } });
    return Number(result._sum.amount ?? 0);
  }

  async reallocate(childId: string, teacherId: string): Promise<void> {
    // Fetch all read-only data before the transaction to avoid async queries inside a loop
    // within a single pg client (interactive transaction), which triggers pg deprecation warnings.
    const [payments, lessons, allPairLessons] = await Promise.all([
      this.prisma.payment.findMany({
        where: { childId, teacherId },
        orderBy: { date: 'asc' },
        select: { id: true, amount: true },
      }),
      this.prisma.lesson.findMany({
        where: { childId, teacherId, status: { in: ['CONDUCTED', 'PLANNED'] } },
        orderBy: { startDate: 'asc' },
        select: { id: true, price: true, status: true, startDate: true },
      }),
      this.prisma.lesson.findMany({
        where: { childId, teacherId },
        select: { id: true },
      }),
    ]);

    const allPairLessonIds = allPairLessons.map(l => l.id);
    const lessonDateMap = new Map(lessons.map(l => [l.id, l.startDate]));

    const records = payments.length > 0
      ? computeAllocation(
          payments.map(p => ({ id: p.id, amount: Number(p.amount) })),
          lessons.map(l => ({ id: l.id, price: Number(l.price), status: l.status as 'CONDUCTED' | 'PLANNED' })),
        )
      : [];

    // Pre-fetch commissions for all unique lesson dates (DEBT records only)
    const dateKeyToDate = new Map<string, Date>();
    for (const r of records) {
      if (r.type !== 'DEBT') continue;
      const startDate = lessonDateMap.get(r.lessonId);
      if (!startDate) continue;
      const dateKey = startDate.toISOString().slice(0, 10);
      if (!dateKeyToDate.has(dateKey)) dateKeyToDate.set(dateKey, startDate);
    }

    const commissionEntries = await Promise.all(
      [...dateKeyToDate.entries()].map(async ([dateKey, startDate]) => {
        const commission = await this.prisma.teacherCommission.findFirst({
          where: { teacherId, effectiveFrom: { lte: startDate } },
          orderBy: { effectiveFrom: 'desc' },
          select: { percentage: true },
        });
        return [dateKey, commission ? Number(commission.percentage) : null] as const;
      }),
    );
    const commissionCache = new Map(commissionEntries);

    // Transaction contains only writes — no async lookups inside loops
    await this.prisma.$transaction(async (tx) => {
      if (allPairLessonIds.length > 0) {
        await tx.schoolTransaction.deleteMany({
          where: { lessonId: { in: allPairLessonIds }, reason: SchoolTransactionReason.LESSON_SCHOOL_SHARE },
        });
      }

      await tx.paymentLesson.deleteMany({
        where: { paymentId: { in: payments.map(p => p.id) } },
      });

      if (payments.length === 0 || records.length === 0) return;

      const createdPLs = await tx.paymentLesson.createManyAndReturn({
        data: records.map(r => ({
          paymentId: r.paymentId,
          lessonId: r.lessonId,
          amount: r.amount,
          type: r.type as PaymentLessonType,
        })),
        select: { id: true, lessonId: true, amount: true, type: true },
      });

      const debtPLs = createdPLs.filter(pl => pl.type === 'DEBT');
      if (debtPLs.length === 0) return;

      const earningsData: Array<{
        teacherId: string;
        lessonId: string;
        paymentLessonId: string;
        amount: Prisma.Decimal;
        percentage: Prisma.Decimal;
      }> = [];
      const schoolTxData: Array<{
        amount: Prisma.Decimal;
        reason: SchoolTransactionReason;
        lessonId: string;
      }> = [];

      for (const pl of debtPLs) {
        const startDate = lessonDateMap.get(pl.lessonId);
        if (!startDate) continue;

        const dateKey = startDate.toISOString().slice(0, 10);
        const pct = commissionCache.get(dateKey);
        if (pct === null || pct === undefined) continue;

        const teacherAmt = Math.round(Number(pl.amount) * pct) / 100;
        const schoolAmt = Number(pl.amount);

        if (teacherAmt > 0) {
          earningsData.push({
            teacherId,
            lessonId: pl.lessonId,
            paymentLessonId: pl.id,
            amount: new Prisma.Decimal(teacherAmt),
            percentage: new Prisma.Decimal(pct),
          });
        }

        if (schoolAmt > 0) {
          schoolTxData.push({
            amount: new Prisma.Decimal(schoolAmt),
            reason: SchoolTransactionReason.LESSON_SCHOOL_SHARE,
            lessonId: pl.lessonId,
          });
        }
      }

      if (earningsData.length > 0) {
        await tx.teacherEarning.createMany({ data: earningsData });
      }
      if (schoolTxData.length > 0) {
        await tx.schoolTransaction.createMany({ data: schoolTxData });
      }
    });
  }

  async create(dto: CreatePaymentDto, adminId: string) {
    const payment = await this.prisma.payment.create({
      data: {
        childId: dto.childId,
        teacherId: dto.teacherId,
        amount: new Prisma.Decimal(dto.amount),
        date: new Date(dto.date),
        notes: dto.notes,
        createdById: adminId,
      },
      select: paymentSelect,
    });
    await this.reallocate(dto.childId, dto.teacherId);
    return payment;
  }

  async findAll(query: PaymentQueryDto) {
    const where: Prisma.PaymentWhereInput = {};
    if (query.teacherId) where.teacherId = query.teacherId;
    if (query.from || query.to) {
      where.date = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    const { page, limit } = query;
    if (limit != null) {
      const take = limit;
      const skip = ((page ?? 1) - 1) * limit;
      const [total, data] = await Promise.all([
        this.prisma.payment.count({ where }),
        this.prisma.payment.findMany({ where, select: paymentSelect, orderBy: { date: 'desc' }, skip, take }),
      ]);
      return { data, total, page: page ?? 1, totalPages: Math.ceil(total / limit) };
    }
    return this.prisma.payment.findMany({
      where,
      select: paymentSelect,
      orderBy: { date: 'desc' },
    });
  }

  async previewAllocation(dto: PreviewPaymentDto) {
    const { childId, teacherId, amount, excludePaymentId } = dto;

    const [payments, lessons] = await Promise.all([
      this.prisma.payment.findMany({
        where: { childId, teacherId, ...(excludePaymentId ? { id: { not: excludePaymentId } } : {}) },
        orderBy: { date: 'asc' },
        select: { id: true, amount: true },
      }),
      this.prisma.lesson.findMany({
        where: { childId, teacherId, status: { in: ['CONDUCTED', 'PLANNED'] } },
        orderBy: { startDate: 'asc' },
        select: { id: true, price: true, status: true },
      }),
    ]);

    const queue = lessons.map(l => ({
      id: l.id,
      status: l.status as 'CONDUCTED' | 'PLANNED',
      remaining: Number(l.price),
    }));

    let qi = 0;
    for (const payment of payments) {
      let rem = Number(payment.amount);
      while (rem > 0 && qi < queue.length) {
        const lesson = queue[qi];
        const toApply = Math.min(rem, lesson.remaining);
        rem = Math.round((rem - toApply) * 100) / 100;
        lesson.remaining = Math.round((lesson.remaining - toApply) * 100) / 100;
        if (lesson.remaining === 0) qi++;
        else break;
      }
    }

    let newRem = amount;
    let debtLessons = 0;
    let prepaidLessons = 0;
    let pqi = qi;

    while (newRem > 0 && pqi < queue.length) {
      const lesson = queue[pqi];
      const toApply = Math.min(newRem, lesson.remaining);
      newRem = Math.round((newRem - toApply) * 100) / 100;
      lesson.remaining = Math.round((lesson.remaining - toApply) * 100) / 100;
      if (lesson.remaining === 0) {
        if (lesson.status === 'CONDUCTED') debtLessons++;
        else prepaidLessons++;
        pqi++;
      } else {
        break;
      }
    }

    const nextLesson = pqi < queue.length ? queue[pqi] : null;
    const [schoolBalance, currentPrice] = await Promise.all([
      this.getSchoolBalance(),
      this.prisma.lessonPrice.findFirst({
        where: { childId, teacherId },
        orderBy: { effectiveDate: 'desc' },
        select: { price: true },
      }),
    ]);

    const lessonPrice = currentPrice ? Number(currentPrice.price) : null;
    const virtualPrepaidLessons = (lessonPrice && newRem >= lessonPrice)
      ? Math.floor(Math.round(newRem * 100) / Math.round(lessonPrice * 100))
      : 0;

    return {
      debtLessons,
      prepaidLessons,
      paymentLeftover: newRem,
      nextLessonShortfall: nextLesson ? nextLesson.remaining : 0,
      schoolBalance,
      virtualPrepaidLessons,
      lessonPrice,
    };
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      select: paymentSelect,
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async update(id: string, dto: UpdatePaymentDto) {
    const existing = await this.findOne(id);
    const payment = await this.prisma.payment.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined ? { amount: new Prisma.Decimal(dto.amount) } : {}),
        ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      select: paymentSelect,
    });
    await this.reallocate(existing.child.id, existing.teacher.id);
    return payment;
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findOne(id);
    await this.prisma.payment.delete({ where: { id } });
    await this.reallocate(existing.child.id, existing.teacher.id);
  }

  async getSchoolAccountInfo() {
    const [balanceResult, transactions] = await Promise.all([
      this.prisma.schoolTransaction.aggregate({ _sum: { amount: true } }),
      this.prisma.schoolTransaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          amount: true,
          reason: true,
          note: true,
          admin: { select: { id: true, name: true } },
          createdAt: true,
        },
      }),
    ]);
    return {
      balance: Number(balanceResult._sum.amount ?? 0),
      transactions,
    };
  }

  async writeoff(paymentId: string, adminId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, amount: true, childId: true, teacherId: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    const preview = await this.previewAllocation({
      childId: payment.childId,
      teacherId: payment.teacherId,
      amount: Number(payment.amount),
      excludePaymentId: undefined,
    });

    if (preview.paymentLeftover <= 0) {
      throw new BadRequestException('No leftover to write off');
    }

    return this.prisma.schoolTransaction.create({
      data: {
        amount: preview.paymentLeftover,
        reason: SchoolTransactionReason.OVERPAYMENT_WRITEOFF,
        paymentId,
        adminId,
        note: `Списання залишку з оплати`,
      },
      select: { id: true, amount: true, reason: true, createdAt: true },
    });
  }

  async topup(paymentId: string, adminId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, amount: true, childId: true, teacherId: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    const preview = await this.previewAllocation({
      childId: payment.childId,
      teacherId: payment.teacherId,
      amount: Number(payment.amount),
      excludePaymentId: undefined,
    });

    if (preview.nextLessonShortfall <= 0) {
      throw new BadRequestException('No shortfall to top up');
    }

    const balance = await this.getSchoolBalance();
    if (balance < preview.nextLessonShortfall) {
      throw new BadRequestException('Insufficient school balance');
    }

    return this.prisma.schoolTransaction.create({
      data: {
        amount: -preview.nextLessonShortfall,
        reason: SchoolTransactionReason.UNDERPAYMENT_TOPUP,
        paymentId,
        adminId,
        note: `Поповнення з рахунку школи`,
      },
      select: { id: true, amount: true, reason: true, createdAt: true },
    });
  }
}
