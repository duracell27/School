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
  child: { select: { id: true, name: true, avatar: true } },
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
    const [payments, lessons] = await Promise.all([
      this.prisma.payment.findMany({
        where: { childId, teacherId },
        orderBy: { date: 'asc' },
        select: { id: true, amount: true },
      }),
      this.prisma.lesson.findMany({
        where: { childId, teacherId, status: { in: ['CONDUCTED', 'PLANNED'] } },
        orderBy: { startDate: 'asc' },
        select: { id: true, price: true, status: true },
      }),
    ]);

    if (payments.length === 0) return;

    await this.prisma.paymentLesson.deleteMany({
      where: { paymentId: { in: payments.map(p => p.id) } },
    });

    const records = computeAllocation(
      payments.map(p => ({ id: p.id, amount: Number(p.amount) })),
      lessons.map(l => ({ id: l.id, price: Number(l.price), status: l.status as 'CONDUCTED' | 'PLANNED' })),
    );

    if (records.length > 0) {
      await this.prisma.paymentLesson.createMany({
        data: records.map(r => ({
          paymentId: r.paymentId,
          lessonId: r.lessonId,
          amount: r.amount,
          type: r.type as PaymentLessonType,
        })),
      });
    }
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
