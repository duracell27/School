# Teacher Commission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track teacher earnings as a percentage of each payment allocated to their lessons, show potential (unconfirmed) vs official (payment-backed) balances, and support manual payouts.

**Architecture:** Extend `reallocate()` in PaymentsService to auto-create `TeacherEarning` and `SchoolTransaction(LESSON_SCHOOL_SHARE)` records after each allocation. A new CommissionsModule exposes rate management, payout recording, and balance queries. The frontend adds a `/commissions` admin page with per-teacher cards.

**Tech Stack:** NestJS + Prisma 7.7 (backend), Next.js + React Query (frontend), PostgreSQL

---

## File Map

**Create:**
- `back/src/commissions/commissions.module.ts`
- `back/src/commissions/commissions.service.ts`
- `back/src/commissions/commissions.service.spec.ts`
- `back/src/commissions/commissions.controller.ts`
- `back/src/commissions/dto/create-commission.dto.ts`
- `back/src/commissions/dto/create-payout.dto.ts`
- `front/src/types/commission.ts`
- `front/src/lib/commissions.ts`
- `front/src/app/(admin)/commissions/page.tsx`
- `front/src/app/(admin)/commissions/_components/TeacherCommissionCard.tsx`
- `front/src/app/(admin)/commissions/_components/CommissionRateModal.tsx`
- `front/src/app/(admin)/commissions/_components/PayoutModal.tsx`

**Modify:**
- `back/prisma/schema.prisma` — add 3 new models, extend SchoolTransaction, update User/Lesson/PaymentLesson back-relations
- `back/src/payments/payments.service.ts` — extend `reallocate()` to write TeacherEarning + SchoolTransaction(LESSON_SCHOOL_SHARE)
- `back/src/app.module.ts` — register CommissionsModule
- `front/src/app/(admin)/layout.tsx` — add Commissions nav item

---

### Task 1: Prisma schema — new models and relation changes

**Files:**
- Modify: `back/prisma/schema.prisma`

- [ ] **Step 1: Update `SchoolTransactionReason` enum and `SchoolTransaction` model**

Replace the enum and model in `back/prisma/schema.prisma`:

```prisma
enum SchoolTransactionReason {
  OVERPAYMENT_WRITEOFF
  UNDERPAYMENT_TOPUP
  LESSON_SCHOOL_SHARE
}

model SchoolTransaction {
  id        String                  @id @default(cuid())
  amount    Decimal
  reason    SchoolTransactionReason
  paymentId String?
  payment   Payment?                @relation(fields: [paymentId], references: [id], onDelete: SetNull)
  lessonId  String?
  lesson    Lesson?                 @relation(fields: [lessonId], references: [id], onDelete: SetNull)
  adminId   String?
  admin     User?                   @relation("SchoolTxAdmin", fields: [adminId], references: [id], onDelete: SetNull)
  note      String?
  createdAt DateTime                @default(now())
}
```

- [ ] **Step 2: Add three new models at the end of `schema.prisma`**

```prisma
model TeacherCommission {
  id            String   @id @default(cuid())
  teacherId     String
  teacher       User     @relation("TeacherCommissionReceiver", fields: [teacherId], references: [id], onDelete: Cascade)
  percentage    Decimal
  effectiveFrom DateTime
  createdById   String
  createdBy     User     @relation("TeacherCommissionCreator", fields: [createdById], references: [id], onDelete: Restrict)
  createdAt     DateTime @default(now())

  @@index([teacherId, effectiveFrom])
}

model TeacherEarning {
  id              String        @id @default(cuid())
  teacherId       String
  teacher         User          @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  lessonId        String
  lesson          Lesson        @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  paymentLessonId String        @unique
  paymentLesson   PaymentLesson @relation(fields: [paymentLessonId], references: [id], onDelete: Cascade)
  amount          Decimal
  percentage      Decimal
  createdAt       DateTime      @default(now())

  @@index([teacherId])
}

model TeacherPayout {
  id        String   @id @default(cuid())
  teacherId String
  teacher   User     @relation("TeacherPayoutReceiver", fields: [teacherId], references: [id], onDelete: Restrict)
  amount    Decimal
  adminId   String
  admin     User     @relation("TeacherPayoutAdmin", fields: [adminId], references: [id], onDelete: Restrict)
  notes     String?
  createdAt DateTime @default(now())

  @@index([teacherId])
}
```

- [ ] **Step 3: Add back-relations to `User`, `Lesson`, and `PaymentLesson`**

In the `User` model, add these fields:
```prisma
teacherCommissions   TeacherCommission[] @relation("TeacherCommissionReceiver")
commissionsCreated   TeacherCommission[] @relation("TeacherCommissionCreator")
teacherEarnings      TeacherEarning[]
teacherPayoutsReceived TeacherPayout[]   @relation("TeacherPayoutReceiver")
teacherPayoutsAdmined  TeacherPayout[]   @relation("TeacherPayoutAdmin")
```

In the `Lesson` model, add:
```prisma
teacherEarnings    TeacherEarning[]
schoolTransactions SchoolTransaction[]
```

In the `PaymentLesson` model, add:
```prisma
teacherEarning TeacherEarning?
```

- [ ] **Step 4: Generate and run migration**

```bash
cd back
npx prisma migrate dev --name add_teacher_commission
```

Expected: migration applied, new tables created, `SchoolTransaction.adminId` is now nullable.

- [ ] **Step 5: Verify generated client**

```bash
npx prisma generate
```

Expected: no errors, client regenerated.

- [ ] **Step 6: Commit**

```bash
git add back/prisma/schema.prisma back/prisma/migrations/
git commit -m "feat(schema): add TeacherCommission, TeacherEarning, TeacherPayout models"
```

---

### Task 2: CommissionsService — rate management

**Files:**
- Create: `back/src/commissions/dto/create-commission.dto.ts`
- Create: `back/src/commissions/commissions.service.ts`
- Create: `back/src/commissions/commissions.service.spec.ts`

- [ ] **Step 1: Create the commission DTO**

Create `back/src/commissions/dto/create-commission.dto.ts`:

```typescript
import { IsString, IsNotEmpty, IsDateString } from 'class-validator';
import { IsDecimal } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCommissionDto {
  @IsString() @IsNotEmpty() teacherId: string;

  @IsDecimal({ decimal_digits: '0,2' })
  @Type(() => String)
  percentage: string;

  @IsDateString() effectiveFrom: string;
}
```

- [ ] **Step 2: Write failing tests for commission rate methods**

Create `back/src/commissions/commissions.service.spec.ts`:

```typescript
import { CommissionsService } from './commissions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CommissionsService — commission rates', () => {
  let service: CommissionsService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    prisma = {
      teacherCommission: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      teacherEarning: { aggregate: jest.fn() },
      teacherPayout: { aggregate: jest.fn(), create: jest.fn(), findMany: jest.fn() },
      lesson: { findMany: jest.fn() },
    } as unknown as jest.Mocked<PrismaService>;
    service = new CommissionsService(prisma);
  });

  it('setCommission creates a new TeacherCommission record', async () => {
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
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd back && npx jest commissions.service.spec --no-coverage
```

Expected: FAIL — `CommissionsService` not found.

- [ ] **Step 4: Implement CommissionsService with rate methods**

Create `back/src/commissions/commissions.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { CreatePayoutDto } from './dto/create-payout.dto';

@Injectable()
export class CommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async setCommission(dto: CreateCommissionDto, adminId: string) {
    return this.prisma.teacherCommission.create({
      data: {
        teacherId: dto.teacherId,
        percentage: new Prisma.Decimal(dto.percentage),
        effectiveFrom: new Date(dto.effectiveFrom),
        createdById: adminId,
      },
      select: { id: true, teacherId: true, percentage: true, effectiveFrom: true, createdAt: true },
    });
  }

  async getCommissions(teacherId: string) {
    return this.prisma.teacherCommission.findMany({
      where: { teacherId },
      orderBy: { effectiveFrom: 'desc' },
      select: { id: true, percentage: true, effectiveFrom: true, createdAt: true },
    });
  }

  async createPayout(dto: CreatePayoutDto, adminId: string) {
    return this.prisma.teacherPayout.create({
      data: {
        teacherId: dto.teacherId,
        amount: new Prisma.Decimal(dto.amount),
        notes: dto.notes,
        adminId,
      },
      select: { id: true, teacherId: true, amount: true, notes: true, createdAt: true },
    });
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

    const round = (n: number) => Math.round(n * 100) / 100;
    return {
      officialEarnings: round(officialEarnings),
      potentialEarnings: round(potentialEarnings),
      totalPayout: round(totalPayout),
      balance: round(officialEarnings - totalPayout),
      potentialBalance: round(officialEarnings + potentialEarnings - totalPayout),
      currentCommission: commissionPct,
    };
  }

  async getAllTeachersWithBalances() {
    const teachers = await this.prisma.user.findMany({
      where: { role: 'TEACHER' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, avatar: true, status: true },
    });
    return Promise.all(
      teachers.map(async t => ({ ...t, balance: await this.getTeacherBalance(t.id) })),
    );
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd back && npx jest commissions.service.spec --no-coverage
```

Expected: PASS — 2 tests.

- [ ] **Step 6: Commit**

```bash
git add back/src/commissions/
git commit -m "feat(commissions): CommissionsService — rate management and balance queries"
```

---

### Task 3: CommissionsService — payout DTO + tests

**Files:**
- Create: `back/src/commissions/dto/create-payout.dto.ts`
- Modify: `back/src/commissions/commissions.service.spec.ts`

- [ ] **Step 1: Create the payout DTO**

Create `back/src/commissions/dto/create-payout.dto.ts`:

```typescript
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { IsDecimal } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePayoutDto {
  @IsString() @IsNotEmpty() teacherId: string;

  @IsDecimal({ decimal_digits: '0,2' })
  @Type(() => String)
  amount: string;

  @IsString() @IsOptional() notes?: string;
}
```

- [ ] **Step 2: Add payout tests to spec file**

Append these tests inside the describe block in `back/src/commissions/commissions.service.spec.ts`:

```typescript
  it('createPayout saves with correct adminId', async () => {
    (prisma.teacherPayout.create as jest.Mock).mockResolvedValue({ id: 'po1' });
    const dto = { teacherId: 't1', amount: '1000.00', notes: 'bonus' };
    await service.createPayout(dto as any, 'admin1');
    expect(prisma.teacherPayout.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ teacherId: 't1', adminId: 'admin1' }),
      }),
    );
  });

  it('getTeacherBalance returns zeroes when no data', async () => {
    (prisma.teacherEarning.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: null } });
    (prisma.teacherPayout.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: null } });
    (prisma.teacherCommission.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.lesson.findMany as jest.Mock).mockResolvedValue([]);
    const result = await service.getTeacherBalance('t1');
    expect(result).toEqual({
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
```

- [ ] **Step 3: Run tests**

```bash
cd back && npx jest commissions.service.spec --no-coverage
```

Expected: PASS — 5 tests.

- [ ] **Step 4: Commit**

```bash
git add back/src/commissions/dto/create-payout.dto.ts back/src/commissions/commissions.service.spec.ts
git commit -m "feat(commissions): payout DTO and service tests"
```

---

### Task 4: CommissionsController, CommissionsModule, AppModule

**Files:**
- Create: `back/src/commissions/commissions.controller.ts`
- Create: `back/src/commissions/commissions.module.ts`
- Modify: `back/src/app.module.ts`

- [ ] **Step 1: Create CommissionsController**

Create `back/src/commissions/commissions.controller.ts`:

```typescript
import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { CommissionsService } from './commissions.service';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { CreatePayoutDto } from './dto/create-payout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface JwtUser { sub: string; role: Role; }

@Controller('commissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class CommissionsController {
  constructor(private readonly service: CommissionsService) {}

  @Get()
  getAllWithBalances() {
    return this.service.getAllTeachersWithBalances();
  }

  @Get(':teacherId/balance')
  getBalance(@Param('teacherId') teacherId: string) {
    return this.service.getTeacherBalance(teacherId);
  }

  @Get(':teacherId/rate')
  getRates(@Param('teacherId') teacherId: string) {
    return this.service.getCommissions(teacherId);
  }

  @Post('rate')
  setRate(@Body() dto: CreateCommissionDto, @Req() req: Request) {
    const user = req['user'] as JwtUser;
    return this.service.setCommission(dto, user.sub);
  }

  @Get(':teacherId/payouts')
  getPayouts(@Param('teacherId') teacherId: string) {
    return this.service.getPayouts(teacherId);
  }

  @Post('payouts')
  createPayout(@Body() dto: CreatePayoutDto, @Req() req: Request) {
    const user = req['user'] as JwtUser;
    return this.service.createPayout(dto, user.sub);
  }
}
```

- [ ] **Step 2: Create CommissionsModule**

Create `back/src/commissions/commissions.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommissionsController } from './commissions.controller';
import { CommissionsService } from './commissions.service';

@Module({
  imports: [AuthModule],
  controllers: [CommissionsController],
  providers: [CommissionsService],
})
export class CommissionsModule {}
```

- [ ] **Step 3: Register in AppModule**

In `back/src/app.module.ts`, add the import:

```typescript
import { CommissionsModule } from './commissions/commissions.module';
```

And add `CommissionsModule` to the `imports` array:

```typescript
imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  PrismaModule,
  UsersModule,
  AuthModule,
  ChildrenModule,
  LessonPricesModule,
  LessonsModule,
  DashboardModule,
  PaymentsModule,
  CommissionsModule,
],
```

- [ ] **Step 4: Start backend and smoke-test**

```bash
cd back && npx ts-node -r tsconfig-paths/register src/main.ts &
curl -s http://localhost:3001/commissions
```

Expected: `401 Unauthorized` (auth guard working).

- [ ] **Step 5: Commit**

```bash
git add back/src/commissions/commissions.controller.ts back/src/commissions/commissions.module.ts back/src/app.module.ts
git commit -m "feat(commissions): controller, module, register in AppModule"
```

---

### Task 5: Extend PaymentsService.reallocate with commission earnings

**Files:**
- Modify: `back/src/payments/payments.service.ts`

- [ ] **Step 1: Add imports at the top of `payments.service.ts`**

The existing import line is:
```typescript
import { PaymentLessonType, SchoolTransactionReason, Prisma } from '@prisma/client';
```

No change needed — `SchoolTransactionReason` is already imported; `Prisma` is already imported.

- [ ] **Step 2: Replace the `reallocate` method**

Replace the existing `reallocate` method (lines 77–112) with:

```typescript
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
      select: { id: true, price: true, status: true, startDate: true },
    }),
  ]);

  if (payments.length === 0) return;

  // Delete SchoolTransaction(LESSON_SCHOOL_SHARE) for conducted lessons in this pair
  const conductedIds = lessons.filter(l => l.status === 'CONDUCTED').map(l => l.id);
  if (conductedIds.length > 0) {
    await this.prisma.schoolTransaction.deleteMany({
      where: { lessonId: { in: conductedIds }, reason: SchoolTransactionReason.LESSON_SCHOOL_SHARE },
    });
  }

  // Delete PaymentLesson (cascades to TeacherEarning)
  await this.prisma.paymentLesson.deleteMany({
    where: { paymentId: { in: payments.map(p => p.id) } },
  });

  const records = computeAllocation(
    payments.map(p => ({ id: p.id, amount: Number(p.amount) })),
    lessons.map(l => ({ id: l.id, price: Number(l.price), status: l.status as 'CONDUCTED' | 'PLANNED' })),
  );

  if (records.length === 0) return;

  const createdPLs = await this.prisma.paymentLesson.createManyAndReturn({
    data: records.map(r => ({
      paymentId: r.paymentId,
      lessonId: r.lessonId,
      amount: r.amount,
      type: r.type as PaymentLessonType,
    })),
    select: { id: true, lessonId: true, amount: true, type: true },
  });

  // Build TeacherEarning + SchoolTransaction(LESSON_SCHOOL_SHARE) for DEBT allocations
  const debtPLs = createdPLs.filter(pl => pl.type === 'DEBT');
  if (debtPLs.length === 0) return;

  const lessonDateMap = new Map(lessons.map(l => [l.id, l.startDate]));
  const commissionCache = new Map<string, number | null>();
  const earningsData: Array<{ teacherId: string; lessonId: string; paymentLessonId: string; amount: Prisma.Decimal; percentage: Prisma.Decimal }> = [];
  const schoolTxData: Array<{ amount: Prisma.Decimal; reason: typeof SchoolTransactionReason.LESSON_SCHOOL_SHARE; lessonId: string }> = [];

  for (const pl of debtPLs) {
    const startDate = lessonDateMap.get(pl.lessonId);
    if (!startDate) continue;

    const dateKey = startDate.toISOString();
    if (!commissionCache.has(dateKey)) {
      const commission = await this.prisma.teacherCommission.findFirst({
        where: { teacherId, effectiveFrom: { lte: startDate } },
        orderBy: { effectiveFrom: 'desc' },
        select: { percentage: true },
      });
      commissionCache.set(dateKey, commission ? Number(commission.percentage) : null);
    }

    const pct = commissionCache.get(dateKey);
    if (pct === null || pct === undefined) continue;

    const teacherAmt = Math.round(Number(pl.amount) * pct) / 100;
    const schoolAmt = Math.round(Number(pl.amount) * (100 - pct)) / 100;

    earningsData.push({
      teacherId,
      lessonId: pl.lessonId,
      paymentLessonId: pl.id,
      amount: new Prisma.Decimal(teacherAmt),
      percentage: new Prisma.Decimal(pct),
    });

    if (schoolAmt > 0) {
      schoolTxData.push({
        amount: new Prisma.Decimal(schoolAmt),
        reason: SchoolTransactionReason.LESSON_SCHOOL_SHARE,
        lessonId: pl.lessonId,
      });
    }
  }

  if (earningsData.length > 0) {
    await this.prisma.teacherEarning.createMany({ data: earningsData });
  }
  if (schoolTxData.length > 0) {
    await this.prisma.schoolTransaction.createMany({ data: schoolTxData });
  }
}
```

- [ ] **Step 3: Run existing payment tests**

```bash
cd back && npx jest payments.service.spec --no-coverage
```

Expected: PASS — all existing `computeAllocation` tests still pass (pure function unchanged).

- [ ] **Step 4: Commit**

```bash
git add back/src/payments/payments.service.ts
git commit -m "feat(payments): extend reallocate to create TeacherEarning and SchoolTransaction(LESSON_SCHOOL_SHARE)"
```

---

### Task 6: Frontend types and hooks

**Files:**
- Create: `front/src/types/commission.ts`
- Create: `front/src/lib/commissions.ts`

- [ ] **Step 1: Create commission types**

Create `front/src/types/commission.ts`:

```typescript
export interface TeacherCommissionRate {
  id: string;
  percentage: string;
  effectiveFrom: string;
  createdAt: string;
}

export interface TeacherPayout {
  id: string;
  teacherId: string;
  amount: string;
  notes: string | null;
  createdAt: string;
  admin: { id: string; name: string };
}

export interface TeacherBalance {
  officialEarnings: number;
  potentialEarnings: number;
  totalPayout: number;
  balance: number;
  potentialBalance: number;
  currentCommission: number | null;
}

export interface TeacherWithBalance {
  id: string;
  name: string;
  avatar: string | null;
  status: string;
  balance: TeacherBalance;
}

export interface SetCommissionPayload {
  teacherId: string;
  percentage: string;
  effectiveFrom: string;
}

export interface CreatePayoutPayload {
  teacherId: string;
  amount: string;
  notes?: string;
}
```

- [ ] **Step 2: Create commission hooks**

Create `front/src/lib/commissions.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';
import type {
  TeacherWithBalance, TeacherBalance, TeacherCommissionRate,
  TeacherPayout, SetCommissionPayload, CreatePayoutPayload,
} from '@/types/commission';

export function useTeachersWithBalances() {
  return useQuery({
    queryKey: ['commissions'],
    queryFn: () => apiFetch<TeacherWithBalance[]>('/commissions'),
  });
}

export function useTeacherBalance(teacherId: string) {
  return useQuery({
    queryKey: ['commissions', teacherId, 'balance'],
    queryFn: () => apiFetch<TeacherBalance>(`/commissions/${teacherId}/balance`),
    enabled: !!teacherId,
  });
}

export function useTeacherRates(teacherId: string) {
  return useQuery({
    queryKey: ['commissions', teacherId, 'rates'],
    queryFn: () => apiFetch<TeacherCommissionRate[]>(`/commissions/${teacherId}/rate`),
    enabled: !!teacherId,
  });
}

export function useTeacherPayouts(teacherId: string) {
  return useQuery({
    queryKey: ['commissions', teacherId, 'payouts'],
    queryFn: () => apiFetch<TeacherPayout[]>(`/commissions/${teacherId}/payouts`),
    enabled: !!teacherId,
  });
}

export function useSetCommission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SetCommissionPayload) =>
      apiFetch('/commissions/rate', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['commissions'] }),
  });
}

export function useCreatePayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePayoutPayload) =>
      apiFetch('/commissions/payouts', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['commissions'] }),
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add front/src/types/commission.ts front/src/lib/commissions.ts
git commit -m "feat(commissions): frontend types and hooks"
```

---

### Task 7: CommissionRateModal component

**Files:**
- Create: `front/src/app/(admin)/commissions/_components/CommissionRateModal.tsx`

- [ ] **Step 1: Create the modal**

Create `front/src/app/(admin)/commissions/_components/CommissionRateModal.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSetCommission } from '@/lib/commissions';

interface Props {
  teacherId: string;
  open: boolean;
  onClose: () => void;
}

export function CommissionRateModal({ teacherId, open, onClose }: Props) {
  const [percentage, setPercentage] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const setCommission = useSetCommission();

  function handleSave() {
    if (!percentage || !effectiveFrom) return;
    setCommission.mutate(
      { teacherId, percentage, effectiveFrom },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Встановити ставку комісії</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Відсоток (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.01}
              placeholder="70"
              value={percentage}
              onChange={e => setPercentage(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Діє з</Label>
            <Input
              type="date"
              value={effectiveFrom}
              onChange={e => setEffectiveFrom(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Скасувати</Button>
            <Button onClick={handleSave} disabled={setCommission.isPending || !percentage}>
              Зберегти
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add front/src/app/(admin)/commissions/_components/CommissionRateModal.tsx
git commit -m "feat(commissions): CommissionRateModal component"
```

---

### Task 8: PayoutModal component

**Files:**
- Create: `front/src/app/(admin)/commissions/_components/PayoutModal.tsx`

- [ ] **Step 1: Create the modal**

Create `front/src/app/(admin)/commissions/_components/PayoutModal.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePayout } from '@/lib/commissions';

interface Props {
  teacherId: string;
  teacherName: string;
  open: boolean;
  onClose: () => void;
}

export function PayoutModal({ teacherId, teacherName, open, onClose }: Props) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const createPayout = useCreatePayout();

  function handleSave() {
    if (!amount) return;
    createPayout.mutate(
      { teacherId, amount, notes: notes || undefined },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Виплата — {teacherName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Сума (грн)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="1000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Нотатка</Label>
            <Input
              placeholder="Необов'язково"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Скасувати</Button>
            <Button onClick={handleSave} disabled={createPayout.isPending || !amount}>
              Виплатити
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add front/src/app/(admin)/commissions/_components/PayoutModal.tsx
git commit -m "feat(commissions): PayoutModal component"
```

---

### Task 9: TeacherCommissionCard component

**Files:**
- Create: `front/src/app/(admin)/commissions/_components/TeacherCommissionCard.tsx`

- [ ] **Step 1: Create the card**

Create `front/src/app/(admin)/commissions/_components/TeacherCommissionCard.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { UserAvatar } from '@/components/users/user-avatar';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import { useTeacherPayouts } from '@/lib/commissions';
import { CommissionRateModal } from './CommissionRateModal';
import { PayoutModal } from './PayoutModal';
import type { TeacherWithBalance } from '@/types/commission';

interface Props {
  teacher: TeacherWithBalance;
}

export function TeacherCommissionCard({ teacher }: Props) {
  const { id, name, avatar, balance } = teacher;
  const [rateOpen, setRateOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { data: payouts = [] } = useTeacherPayouts(expanded ? id : '');

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserAvatar name={name} avatar={avatar} size={36} />
          <div>
            <p className="font-medium text-sm">{name}</p>
            {balance.currentCommission !== null && (
              <p className="text-xs text-gray-400">{balance.currentCommission}% комісія</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setRateOpen(true)}>
            Ставка
          </Button>
          <Button size="sm" onClick={() => setPayoutOpen(true)}>
            Виплатити
          </Button>
        </div>
      </div>

      {/* Balance row */}
      <div className="flex gap-6 text-sm">
        <div>
          <p className="text-xs text-gray-400">Офіційно нараховано</p>
          <p className={`font-semibold ${balance.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatCurrency(balance.balance)}
          </p>
          <p className="text-xs text-gray-400">{formatCurrency(balance.officialEarnings)} − {formatCurrency(balance.totalPayout)}</p>
        </div>
        {balance.potentialEarnings > 0 && (
          <div>
            <p className="text-xs text-gray-400">Потенційно</p>
            <p className="font-semibold text-gray-400">
              +{formatCurrency(balance.potentialEarnings)}
            </p>
            <p className="text-xs text-gray-400">за непідтверджені заняття</p>
          </div>
        )}
      </div>

      {/* Expandable payout history */}
      <button
        className="text-xs text-blue-500 hover:underline"
        onClick={() => setExpanded(e => !e)}
      >
        {expanded ? 'Згорнути' : 'Історія виплат'}
      </button>

      {expanded && (
        <div className="space-y-1">
          {payouts.length === 0 ? (
            <p className="text-xs text-gray-400">Виплат немає</p>
          ) : (
            payouts.map(p => (
              <div key={p.id} className="flex justify-between text-xs text-gray-600">
                <span>{fmtDate(p.createdAt)}</span>
                <span className="font-medium">{formatCurrency(Number(p.amount))}</span>
                <span className="text-gray-400">{p.notes ?? '—'}</span>
              </div>
            ))
          )}
        </div>
      )}

      <CommissionRateModal
        teacherId={id}
        open={rateOpen}
        onClose={() => setRateOpen(false)}
      />
      <PayoutModal
        teacherId={id}
        teacherName={name}
        open={payoutOpen}
        onClose={() => setPayoutOpen(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add front/src/app/(admin)/commissions/_components/TeacherCommissionCard.tsx
git commit -m "feat(commissions): TeacherCommissionCard component"
```

---

### Task 10: Commissions page and nav item

**Files:**
- Create: `front/src/app/(admin)/commissions/page.tsx`
- Modify: `front/src/app/(admin)/layout.tsx`

- [ ] **Step 1: Create the commissions page**

Create `front/src/app/(admin)/commissions/page.tsx`:

```tsx
'use client';

import { useTeachersWithBalances } from '@/lib/commissions';
import { TeacherCommissionCard } from './_components/TeacherCommissionCard';

export default function CommissionsPage() {
  const { data: teachers = [], isLoading } = useTeachersWithBalances();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Комісії вчителів</h2>
      <div className="grid grid-cols-1 gap-3 max-w-2xl">
        {teachers.map(t => (
          <TeacherCommissionCard key={t.id} teacher={t} />
        ))}
        {teachers.length === 0 && (
          <p className="text-gray-400 text-sm">Вчителів не знайдено</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add nav item in layout**

In `front/src/app/(admin)/layout.tsx`, update `navItems`:

```typescript
const navItems = [
  { href: '/dashboard', label: 'Дашборд' },
  { href: '/calendar', label: 'Календар' },
  { href: '/users', label: 'Користувачі' },
  { href: '/children', label: 'Діти' },
  { href: '/lessons', label: 'Уроки', showBadge: true },
  { href: '/lesson-prices', label: 'Вартість заняття' },
  { href: '/payments', label: 'Оплати' },
  { href: '/commissions', label: 'Комісії' },
];
```

- [ ] **Step 3: Start dev server and verify**

```bash
cd front && npm run dev
```

Open `http://localhost:3000/commissions`. Expected:
- "Комісії" appears in sidebar
- Page loads with teacher cards (or empty state)
- "Ставка" button opens CommissionRateModal
- "Виплатити" button opens PayoutModal
- After saving a rate, card updates with new percentage

- [ ] **Step 4: Commit**

```bash
git add front/src/app/(admin)/commissions/ front/src/app/(admin)/layout.tsx
git commit -m "feat(commissions): commissions page, nav item"
```

---

## Self-Review

**Spec coverage check:**
- ✅ TeacherCommission model with percentage + effectiveFrom → Task 1
- ✅ TeacherEarning with paymentLessonId cascade delete → Task 1
- ✅ TeacherPayout model → Task 1
- ✅ SchoolTransaction LESSON_SCHOOL_SHARE + lessonId + nullable adminId → Task 1
- ✅ reallocate extension: delete old SchoolTx, cascade TeacherEarning, create new → Task 5
- ✅ Commission rate effective at lesson.startDate → Task 5, step 2 (`effectiveFrom: { lte: startDate }`)
- ✅ No commission → silently skip (pct null check in reallocate) → Task 5, step 2
- ✅ officialEarnings / potentialEarnings / balance endpoints → Task 2/3
- ✅ GET /commissions lists all teachers with balances → Task 4
- ✅ POST /commissions/rate sets new rate (never overwrites old) → Task 4
- ✅ POST /commissions/payouts records payout → Task 4
- ✅ Teacher card: official balance (green), potential (grey), payout history → Task 9
- ✅ CommissionRateModal → Task 7
- ✅ PayoutModal → Task 8
- ✅ Nav item → Task 10

**Placeholder scan:** None found.

**Type consistency:**
- `TeacherWithBalance` used in hooks (Task 6) and card component (Task 9) ✅
- `SetCommissionPayload` used in hook and modal ✅
- `CreatePayoutPayload` used in hook and modal ✅
- `commissionCache.get(dateKey)` returns `number | null | undefined` — handled with `if (pct === null || pct === undefined)` ✅
- `SchoolTransactionReason.LESSON_SCHOOL_SHARE` — added to enum in Task 1, used in Task 5 ✅
