import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, Role, SchoolTransactionReason } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { CreatePayoutDto } from './dto/create-payout.dto';
import { UpdatePayoutDto } from './dto/update-payout.dto';

@Injectable()
export class CommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async setCommission(dto: CreateCommissionDto, adminId: string) {
    try {
      return await this.prisma.teacherCommission.create({
        data: {
          teacherId: dto.teacherId,
          percentage: new Prisma.Decimal(dto.percentage),
          effectiveFrom: new Date(dto.effectiveFrom),
          createdById: adminId,
        },
        select: { id: true, teacherId: true, percentage: true, effectiveFrom: true, createdAt: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Commission rate already exists for this teacher and date');
      }
      throw e;
    }
  }

  async getCommissions(teacherId: string) {
    return this.prisma.teacherCommission.findMany({
      where: { teacherId },
      orderBy: { effectiveFrom: 'desc' },
      select: { id: true, percentage: true, effectiveFrom: true, createdAt: true },
    });
  }

  async createPayout(dto: CreatePayoutDto, adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payout = await tx.teacherPayout.create({
        data: {
          teacherId: dto.teacherId,
          amount: new Prisma.Decimal(dto.amount),
          notes: dto.notes,
          adminId,
        },
        select: { id: true, teacherId: true, amount: true, notes: true, createdAt: true,
                  admin: { select: { id: true, name: true } } },
      });
      await tx.schoolTransaction.create({
        data: {
          amount: new Prisma.Decimal(-Number(dto.amount)),
          reason: SchoolTransactionReason.TEACHER_PAYOUT,
          adminId,
          teacherPayoutId: payout.id,
        },
      });
      return payout;
    });
  }

  async updatePayout(id: string, dto: UpdatePayoutDto) {
    const payout = await this.prisma.teacherPayout.findUnique({ where: { id } });
    if (!payout) throw new NotFoundException('Payout not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.teacherPayout.update({
        where: { id },
        data: {
          ...(dto.amount !== undefined ? { amount: new Prisma.Decimal(dto.amount) } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
        },
        select: { id: true, amount: true, notes: true, createdAt: true,
                  admin: { select: { id: true, name: true } } },
      });
      if (dto.amount !== undefined) {
        await tx.schoolTransaction.updateMany({
          where: { teacherPayoutId: id },
          data: { amount: new Prisma.Decimal(-Number(dto.amount)) },
        });
      }
      return updated;
    });
  }

  async deletePayout(id: string) {
    const payout = await this.prisma.teacherPayout.findUnique({ where: { id } });
    if (!payout) throw new NotFoundException('Payout not found');
    // SchoolTransaction cascades via teacherPayoutId
    await this.prisma.teacherPayout.delete({ where: { id } });
  }

  async getPayouts(teacherId: string) {
    return this.prisma.teacherPayout.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, amount: true, notes: true, createdAt: true,
        admin: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * NOTE: potentialEarnings uses the teacher's current commission rate applied to all
   * conducted lessons not yet backed by a TeacherEarning record. This is an intentional
   * approximation — for exact historical figures, use officialEarnings (backed by TeacherEarning).
   */
  async getTeacherBalance(teacherId: string) {
    const [earningsAgg, payoutsAgg, currentCommission, conductedLessons] = await Promise.all([
      this.prisma.teacherEarning.aggregate({ where: { teacherId }, _sum: { amount: true } }),
      this.prisma.teacherPayout.aggregate({ where: { teacherId }, _sum: { amount: true } }),
      this.prisma.teacherCommission.findFirst({
        where: { teacherId },
        orderBy: { effectiveFrom: 'desc' },
        select: { percentage: true },
      }),
      this.prisma.lesson.findMany({
        where: { teacherId, status: 'CONDUCTED' },
        select: {
          id: true, price: true,
          teacherEarnings: { select: { amount: true } },
        },
      }),
    ]);

    const officialEarnings = Number(earningsAgg._sum.amount ?? 0);
    const totalPayout = Number(payoutsAgg._sum.amount ?? 0);
    const commissionPct = currentCommission ? Number(currentCommission.percentage) : null;

    let potentialEarnings = 0;
    if (commissionPct !== null) {
      for (const lesson of conductedLessons) {
        const alreadyEarned = lesson.teacherEarnings.reduce((s, e) => s + Number(e.amount), 0);
        const lessonPotential = Math.round(Number(lesson.price) * commissionPct) / 100;
        potentialEarnings = Math.round((potentialEarnings + Math.max(0, lessonPotential - alreadyEarned)) * 100) / 100;
      }
    }

    const totalRevenue = conductedLessons.reduce((sum, l) => sum + Number(l.price), 0);

    const round = (n: number) => Math.round(n * 100) / 100;
    return {
      officialEarnings: round(officialEarnings),
      potentialEarnings: round(potentialEarnings),
      totalPayout: round(totalPayout),
      balance: round(officialEarnings - totalPayout),
      potentialBalance: round(officialEarnings + potentialEarnings - totalPayout),
      currentCommission: commissionPct,
      totalRevenue: round(totalRevenue),
    };
  }

  async getAllTeachersWithBalances() {
    const teachers = await this.prisma.user.findMany({
      where: { status: 'WORKING', role: { in: [Role.TEACHER, Role.ADMIN_TEACHER] } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, avatar: true, status: true },
    });
    return Promise.all(
      teachers.map(async t => ({ ...t, balance: await this.getTeacherBalance(t.id) })),
    );
  }
}
