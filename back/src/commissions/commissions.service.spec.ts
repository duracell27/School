import { CommissionsService } from './commissions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CommissionsService', () => {
  let service: CommissionsService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    const txFn = jest.fn();
    prisma = {
      teacherCommission: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      teacherEarning: { aggregate: jest.fn() },
      teacherPayout: {
        aggregate: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      lesson: { findMany: jest.fn() },
      user: { findMany: jest.fn() },
      $transaction: jest.fn((cb) => cb({
        teacherPayout: { create: txFn },
        schoolTransaction: { create: jest.fn() },
      })),
    } as unknown as jest.Mocked<PrismaService>;
    (prisma as any)._txPayoutCreate = txFn;
    service = new CommissionsService(prisma);
  });

  it('setCommission creates a new TeacherCommission record with correct adminId', async () => {
    (prisma.teacherCommission.create as jest.Mock).mockResolvedValue({ id: 'c1' });
    const dto = { teacherId: 't1', percentage: '70.00', effectiveFrom: '2026-01-01' };
    await service.setCommission(dto as any, 'admin1');
    expect(prisma.teacherCommission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ teacherId: 't1', createdById: 'admin1' }),
      }),
    );
  });

  it('getCommissions returns rates ordered desc by effectiveFrom', async () => {
    (prisma.teacherCommission.findMany as jest.Mock).mockResolvedValue([{ id: 'c1' }]);
    const result = await service.getCommissions('t1');
    expect(prisma.teacherCommission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { teacherId: 't1' }, orderBy: { effectiveFrom: 'desc' } }),
    );
    expect(result).toHaveLength(1);
  });

  it('createPayout saves with correct adminId', async () => {
    const txCreate = (prisma as any)._txPayoutCreate as jest.Mock;
    txCreate.mockResolvedValue({ id: 'po1' });
    const dto = { teacherId: 't1', amount: '1000.00', notes: 'bonus' };
    await service.createPayout(dto as any, 'admin1');
    expect(txCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ teacherId: 't1', adminId: 'admin1' }),
      }),
    );
  });

  it('getPayouts returns payouts ordered desc by createdAt', async () => {
    (prisma.teacherPayout.findMany as jest.Mock).mockResolvedValue([{ id: 'po1' }]);
    const result = await service.getPayouts('t1');
    expect(prisma.teacherPayout.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teacherId: 't1' },
        orderBy: { createdAt: 'desc' },
      }),
    );
    expect(result).toHaveLength(1);
  });

  it('getTeacherBalance returns zeroes when no data', async () => {
    (prisma.teacherEarning.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: null } });
    (prisma.teacherPayout.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: null } });
    (prisma.teacherCommission.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.lesson.findMany as jest.Mock).mockResolvedValue([]);
    const result = await service.getTeacherBalance('t1');
    expect(result).toMatchObject({
      officialEarnings: 0, potentialEarnings: 0, totalPayout: 0,
      balance: 0, potentialBalance: 0, currentCommission: null,
    });
  });

  it('getTeacherBalance computes potentialEarnings from unpaid conducted lessons', async () => {
    (prisma.teacherEarning.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } });
    (prisma.teacherPayout.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } });
    (prisma.teacherCommission.findFirst as jest.Mock).mockResolvedValue({ percentage: '70' });
    (prisma.lesson.findMany as jest.Mock).mockResolvedValue([
      { id: 'l1', price: '350', teacherEarnings: [] },
    ]);
    const result = await service.getTeacherBalance('t1');
    expect(result.potentialEarnings).toBe(245); // 350 * 70 / 100
    expect(result.potentialBalance).toBe(245);
  });

  it('getTeacherBalance deducts already-earned amounts from potential', async () => {
    (prisma.teacherEarning.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: '100' } });
    (prisma.teacherPayout.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } });
    (prisma.teacherCommission.findFirst as jest.Mock).mockResolvedValue({ percentage: '70' });
    (prisma.lesson.findMany as jest.Mock).mockResolvedValue([
      { id: 'l1', price: '350', teacherEarnings: [{ amount: '100' }] },
    ]);
    const result = await service.getTeacherBalance('t1');
    // officialEarnings = 100, potential = 245 - 100 = 145
    expect(result.officialEarnings).toBe(100);
    expect(result.potentialEarnings).toBe(145);
    expect(result.balance).toBe(100); // officialEarnings - totalPayout
    expect(result.potentialBalance).toBe(245); // 100 + 145 - 0
  });
});
