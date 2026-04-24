# Dashboard Widgets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the calendar-on-dashboard page with a real widget dashboard (earnings, next lesson countdown, lesson chart, children stats, teacher table for admin); move the existing calendar to a new `/calendar` route.

**Architecture:** New `DashboardModule` on the backend exposes five read-only endpoints; the frontend gets a new `lib/dashboard.ts` hooks file, seven focused widget components, and an updated nav. The existing dashboard page moves to `/calendar` unchanged.

**Tech Stack:** NestJS + Prisma (backend), Next.js 16 + React 19 + TanStack Query + Recharts + Shadcn Card (frontend).

---

## File Map

**Backend — create:**
- `back/src/dashboard/dto/dashboard-query.dto.ts`
- `back/src/dashboard/dashboard.service.ts`
- `back/src/dashboard/dashboard.service.spec.ts`
- `back/src/dashboard/dashboard.controller.ts`
- `back/src/dashboard/dashboard.module.ts`

**Backend — modify:**
- `back/src/app.module.ts` — import `DashboardModule`

**Frontend — create:**
- `front/src/types/dashboard.ts`
- `front/src/lib/dashboard.ts`
- `front/src/app/(admin)/calendar/page.tsx`
- `front/src/app/(admin)/dashboard/_components/PeriodSwitcher.tsx`
- `front/src/app/(admin)/dashboard/_components/NextLessonCard.tsx`
- `front/src/app/(admin)/dashboard/_components/SummaryCard.tsx`
- `front/src/app/(admin)/dashboard/_components/ActiveChildrenCard.tsx`
- `front/src/app/(admin)/dashboard/_components/ChildrenByCountry.tsx`
- `front/src/app/(admin)/dashboard/_components/LessonChart.tsx`
- `front/src/app/(admin)/dashboard/_components/TeachersTable.tsx`
- `front/src/app/(admin)/dashboard/page.tsx` — replace with widget dashboard

**Frontend — modify:**
- `front/src/app/(admin)/layout.tsx` — add Calendar nav item, keep Dashboard

---

## Task 1: Backend — DashboardModule scaffold + DTO

**Files:**
- Create: `back/src/dashboard/dto/dashboard-query.dto.ts`
- Create: `back/src/dashboard/dashboard.service.ts`
- Create: `back/src/dashboard/dashboard.controller.ts`
- Create: `back/src/dashboard/dashboard.module.ts`
- Modify: `back/src/app.module.ts`

- [ ] **Step 1: Create the DTO**

```typescript
// back/src/dashboard/dto/dashboard-query.dto.ts
import { IsEnum, IsOptional } from 'class-validator';

export type Period = 'week' | 'month' | 'year';

export class DashboardQueryDto {
  @IsEnum(['week', 'month', 'year'])
  @IsOptional()
  period: Period = 'month';
}
```

- [ ] **Step 2: Create the service skeleton with exported utility functions**

```typescript
// back/src/dashboard/dashboard.service.ts
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
```

- [ ] **Step 3: Create the controller skeleton**

```typescript
// back/src/dashboard/dashboard.controller.ts
import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface JwtUser { sub: string; role: Role; }

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}
}
```

- [ ] **Step 4: Create the module**

```typescript
// back/src/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
```

- [ ] **Step 5: Register in AppModule**

In `back/src/app.module.ts`, add the import:
```typescript
import { DashboardModule } from './dashboard/dashboard.module';
```
And add `DashboardModule` to the `imports` array alongside the other modules.

- [ ] **Step 6: Verify build**

```bash
cd back && npm run build
```
Expected: exits 0 with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add back/src/dashboard back/src/app.module.ts
git commit -m "feat(backend): scaffold DashboardModule with period utilities"
```

---

## Task 2: Backend — Period utility unit tests

**Files:**
- Create: `back/src/dashboard/dashboard.service.spec.ts`

- [ ] **Step 1: Write the tests**

```typescript
// back/src/dashboard/dashboard.service.spec.ts
import {
  getPeriodRange,
  getPrevPeriodRange,
  buildChartSkeleton,
  getLessonGroupKey,
} from './dashboard.service';

describe('getPeriodRange', () => {
  it('month: starts on 1st of current month at midnight', () => {
    const { start, end } = getPeriodRange('month');
    const now = new Date();
    expect(start.getFullYear()).toBe(now.getFullYear());
    expect(start.getMonth()).toBe(now.getMonth());
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(end.getMonth()).toBe((now.getMonth() + 1) % 12);
    expect(end.getDate()).toBe(1);
  });

  it('year: starts Jan 1 of current year, ends Jan 1 next year', () => {
    const { start, end } = getPeriodRange('year');
    const now = new Date();
    expect(start.getFullYear()).toBe(now.getFullYear());
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(end.getFullYear()).toBe(now.getFullYear() + 1);
    expect(end.getMonth()).toBe(0);
  });

  it('week: start is Monday', () => {
    const { start, end } = getPeriodRange('week');
    expect(start.getDay()).toBe(1);
    expect(start.getHours()).toBe(0);
    const diffMs = end.getTime() - start.getTime();
    expect(diffMs).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('getPrevPeriodRange', () => {
  it('month: previous calendar month', () => {
    const { start, end } = getPrevPeriodRange('month');
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    expect(start.getMonth()).toBe(prevMonth);
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(now.getMonth());
    expect(end.getDate()).toBe(1);
  });

  it('year: previous calendar year', () => {
    const { start, end } = getPrevPeriodRange('year');
    const now = new Date();
    expect(start.getFullYear()).toBe(now.getFullYear() - 1);
    expect(end.getFullYear()).toBe(now.getFullYear());
  });

  it('week: 7 days ending on current week Monday', () => {
    const { start, end } = getPrevPeriodRange('week');
    expect(end.getDay()).toBe(1);
    const diffMs = end.getTime() - start.getTime();
    expect(diffMs).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('buildChartSkeleton', () => {
  it('week: 7 points, all zeroed', () => {
    const monday = new Date(2026, 3, 20); // Mon Apr 20 2026
    const points = buildChartSkeleton('week', monday);
    expect(points).toHaveLength(7);
    points.forEach((p) => {
      expect(p.conducted).toBe(0);
      expect(p.cancelled).toBe(0);
      expect(p.planned).toBe(0);
      expect(p.rescheduled).toBe(0);
    });
  });

  it('year: 12 points with Ukrainian month names', () => {
    const points = buildChartSkeleton('year', new Date(2026, 0, 1));
    expect(points).toHaveLength(12);
    expect(points[0].label).toBe('Січ');
    expect(points[11].label).toBe('Груд');
  });
});

describe('getLessonGroupKey', () => {
  it('year: returns Ukrainian month abbreviation', () => {
    const date = new Date(2026, 3, 15); // April
    expect(getLessonGroupKey(date, 'year')).toBe('Квіт');
  });

  it('month: returns Тиж. N based on day', () => {
    expect(getLessonGroupKey(new Date(2026, 3, 1), 'month')).toBe('Тиж. 1');
    expect(getLessonGroupKey(new Date(2026, 3, 7), 'month')).toBe('Тиж. 1');
    expect(getLessonGroupKey(new Date(2026, 3, 8), 'month')).toBe('Тиж. 2');
    expect(getLessonGroupKey(new Date(2026, 3, 28), 'month')).toBe('Тиж. 4');
  });
});
```

- [ ] **Step 2: Run tests — expect all to pass**

```bash
cd back && npm test -- --testPathPattern=dashboard.service.spec
```
Expected: all tests pass (no service methods are tested here — only pure functions).

- [ ] **Step 3: Commit**

```bash
git add back/src/dashboard/dashboard.service.spec.ts
git commit -m "test(dashboard): unit tests for period utility functions"
```

---

## Task 3: Backend — `next-lesson` endpoint

**Files:**
- Modify: `back/src/dashboard/dashboard.service.ts`
- Modify: `back/src/dashboard/dashboard.controller.ts`

- [ ] **Step 1: Add `getNextLesson` to the service**

Add inside the `DashboardService` class:

```typescript
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
```

- [ ] **Step 2: Add the route to the controller**

Add inside `DashboardController`:

```typescript
@Get('next-lesson')
getNextLesson(@Req() req: Request) {
  const user = req['user'] as JwtUser;
  return this.dashboard.getNextLesson(user.sub, user.role);
}
```

- [ ] **Step 3: Build to verify**

```bash
cd back && npm run build
```
Expected: exits 0.

- [ ] **Step 4: Manual smoke test**

Start the backend (`npm run start:dev`) and run:
```bash
curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<your-email>","password":"<your-password>"}' \
  -c /tmp/cookies.txt

curl -s http://localhost:3001/dashboard/next-lesson \
  -b /tmp/cookies.txt | jq .
```
Expected: JSON object `{ id, startDate, endDate, child, teacher }` or `null`.

- [ ] **Step 5: Commit**

```bash
git add back/src/dashboard/dashboard.service.ts back/src/dashboard/dashboard.controller.ts
git commit -m "feat(dashboard): next-lesson endpoint"
```

---

## Task 4: Backend — `summary` endpoint

**Files:**
- Modify: `back/src/dashboard/dashboard.service.ts`
- Modify: `back/src/dashboard/dashboard.controller.ts`

- [ ] **Step 1: Add `getSummary` to the service**

Add inside `DashboardService`:

```typescript
async getSummary(userId: string, userRole: Role, period: Period) {
  const { start, end } = getPeriodRange(period);
  const { start: prevStart, end: prevEnd } = getPrevPeriodRange(period);
  const now = new Date();
  const teacherFilter = userRole === Role.TEACHER ? { teacherId: userId } : {};

  const [conducted, planned, prevConducted] = await Promise.all([
    this.prisma.lesson.aggregate({
      where: { ...teacherFilter, status: 'CONDUCTED', startDate: { gte: start, lt: end } },
      _sum: { price: true },
    }),
    this.prisma.lesson.aggregate({
      where: { ...teacherFilter, status: 'PLANNED', startDate: { gte: now, lt: end } },
      _sum: { price: true },
    }),
    this.prisma.lesson.aggregate({
      where: { ...teacherFilter, status: 'CONDUCTED', startDate: { gte: prevStart, lt: prevEnd } },
      _sum: { price: true },
    }),
  ]);

  const earned = Number(conducted._sum.price ?? 0);
  const expected = Number(planned._sum.price ?? 0);
  const prevEarned = Number(prevConducted._sum.price ?? 0);
  const earnedDelta = prevEarned === 0
    ? null
    : Math.round(((earned - prevEarned) / prevEarned) * 100);

  return { earned, expected, earnedDelta };
}
```

- [ ] **Step 2: Add the route to the controller**

```typescript
@Get('summary')
getSummary(@Query() query: DashboardQueryDto, @Req() req: Request) {
  const user = req['user'] as JwtUser;
  return this.dashboard.getSummary(user.sub, user.role, query.period);
}
```

- [ ] **Step 3: Build and smoke test**

```bash
cd back && npm run build
curl -s "http://localhost:3001/dashboard/summary?period=month" -b /tmp/cookies.txt | jq .
```
Expected: `{ "earned": <number>, "expected": <number>, "earnedDelta": <number|null> }`.

- [ ] **Step 4: Commit**

```bash
git add back/src/dashboard/dashboard.service.ts back/src/dashboard/dashboard.controller.ts
git commit -m "feat(dashboard): summary endpoint (earned, expected, delta)"
```

---

## Task 5: Backend — `chart` endpoint

**Files:**
- Modify: `back/src/dashboard/dashboard.service.ts`
- Modify: `back/src/dashboard/dashboard.controller.ts`

- [ ] **Step 1: Add `getChart` to the service**

Add inside `DashboardService`:

```typescript
async getChart(userId: string, userRole: Role, period: Period): Promise<ChartPoint[]> {
  const { start, end } = getPeriodRange(period);
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
```

- [ ] **Step 2: Add the route**

```typescript
@Get('chart')
getChart(@Query() query: DashboardQueryDto, @Req() req: Request) {
  const user = req['user'] as JwtUser;
  return this.dashboard.getChart(user.sub, user.role, query.period);
}
```

- [ ] **Step 3: Build and smoke test**

```bash
cd back && npm run build
curl -s "http://localhost:3001/dashboard/chart?period=month" -b /tmp/cookies.txt | jq .
```
Expected: array of 4-5 objects `{ label: "Тиж. 1", conducted: N, cancelled: N, planned: N, rescheduled: N }`.

- [ ] **Step 4: Commit**

```bash
git add back/src/dashboard/dashboard.service.ts back/src/dashboard/dashboard.controller.ts
git commit -m "feat(dashboard): chart endpoint with stacked status data"
```

---

## Task 6: Backend — `children-stats` endpoint

**Files:**
- Modify: `back/src/dashboard/dashboard.service.ts`
- Modify: `back/src/dashboard/dashboard.controller.ts`

- [ ] **Step 1: Add `getChildrenStats` to the service**

```typescript
async getChildrenStats(userId: string, userRole: Role) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const teacherFilter = userRole === Role.TEACHER ? { teacherId: userId } : {};

  const activeWhere: Prisma.ChildWhereInput = {
    ...teacherFilter,
    teacherId: { not: null },
    OR: [{ graduationDate: null }, { graduationDate: { gt: now } }],
  };

  const [active, newThisMonth, byCountryRaw] = await Promise.all([
    this.prisma.child.count({ where: activeWhere }),
    this.prisma.child.count({
      where: { ...teacherFilter, hireDate: { gte: monthStart } },
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
```

- [ ] **Step 2: Add the route**

```typescript
@Get('children-stats')
getChildrenStats(@Req() req: Request) {
  const user = req['user'] as JwtUser;
  return this.dashboard.getChildrenStats(user.sub, user.role);
}
```

- [ ] **Step 3: Build and smoke test**

```bash
cd back && npm run build
curl -s "http://localhost:3001/dashboard/children-stats" -b /tmp/cookies.txt | jq .
```
Expected: `{ "active": N, "newThisMonth": N, "byCountry": [{ "country": "UA", "count": N }, ...] }`.

- [ ] **Step 4: Commit**

```bash
git add back/src/dashboard/dashboard.service.ts back/src/dashboard/dashboard.controller.ts
git commit -m "feat(dashboard): children-stats endpoint"
```

---

## Task 7: Backend — `teachers` endpoint (admin only)

**Files:**
- Modify: `back/src/dashboard/dashboard.service.ts`
- Modify: `back/src/dashboard/dashboard.controller.ts`

- [ ] **Step 1: Add `getTeachers` to the service**

```typescript
async getTeachers(period: Period) {
  const { start, end } = getPeriodRange(period);
  const now = new Date();

  const teachers = await this.prisma.user.findMany({
    where: { role: 'TEACHER', status: 'WORKING' },
    select: {
      id: true,
      name: true,
      avatar: true,
      children: {
        where: {
          teacherId: { not: null },
          OR: [{ graduationDate: null }, { graduationDate: { gt: now } }],
        },
        select: { id: true },
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
      childrenCount: t.children.length,
    }))
    .sort((a, b) => b.lessonsCount - a.lessonsCount);
}
```

- [ ] **Step 2: Add the route with admin-only guard**

The method-level `@Roles(Role.ADMIN)` overrides the class-level `@Roles(Role.ADMIN, Role.TEACHER)` via `getAllAndOverride`:

```typescript
@Get('teachers')
@Roles(Role.ADMIN)
getTeachers(@Query() query: DashboardQueryDto) {
  return this.dashboard.getTeachers(query.period);
}
```

- [ ] **Step 3: Build and smoke test**

```bash
cd back && npm run build
# Login as admin first, then:
curl -s "http://localhost:3001/dashboard/teachers?period=month" -b /tmp/cookies.txt | jq .
```
Expected: sorted array of `{ id, name, avatar, lessonsCount, earned, expected, childrenCount }`.

Verify teacher login returns 403:
```bash
# Login as teacher, then:
curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:3001/dashboard/teachers" -b /tmp/teacher_cookies.txt
```
Expected: `403`.

- [ ] **Step 4: Commit**

```bash
git add back/src/dashboard/dashboard.service.ts back/src/dashboard/dashboard.controller.ts
git commit -m "feat(dashboard): teachers table endpoint (admin only)"
```

---

## Task 8: Frontend — Move calendar page + update navigation

**Files:**
- Create: `front/src/app/(admin)/calendar/page.tsx`
- Modify: `front/src/app/(admin)/layout.tsx`
- (The old `front/src/app/(admin)/dashboard/page.tsx` will be replaced in Task 16)

- [ ] **Step 1: Create the calendar page by copying the current dashboard**

Copy the full content of `front/src/app/(admin)/dashboard/page.tsx` into `front/src/app/(admin)/calendar/page.tsx`, then change only the heading text from `'Дашборд'` to `'Календар'`:

```tsx
// front/src/app/(admin)/calendar/page.tsx
// (full copy of the existing dashboard/page.tsx with heading changed)
// Find this line:
<h2 className="text-xl font-semibold">Дашборд</h2>
// Change to:
<h2 className="text-xl font-semibold">Календар</h2>
```

- [ ] **Step 2: Update navigation in layout.tsx**

In `front/src/app/(admin)/layout.tsx`, replace the `navItems` array:

```typescript
const navItems = [
  { href: '/dashboard', label: 'Дашборд' },
  { href: '/calendar', label: 'Календар' },
  { href: '/users', label: 'Користувачі' },
  { href: '/children', label: 'Діти' },
  { href: '/lessons', label: 'Уроки', showBadge: true },
  { href: '/lesson-prices', label: 'Вартість заняття' },
];
```

- [ ] **Step 3: Verify in browser**

Run `cd front && npm run dev`. Navigate to `/calendar` — should show the existing week calendar. Nav should show both "Дашборд" and "Календар" links.

- [ ] **Step 4: Commit**

```bash
git add front/src/app/\(admin\)/calendar front/src/app/\(admin\)/layout.tsx
git commit -m "feat(frontend): move calendar to /calendar route, add nav item"
```

---

## Task 9: Frontend — Types + dashboard API hooks

**Files:**
- Create: `front/src/types/dashboard.ts`
- Create: `front/src/lib/dashboard.ts`

- [ ] **Step 1: Create types**

```typescript
// front/src/types/dashboard.ts
export type Period = 'week' | 'month' | 'year';

export interface DashboardSummary {
  earned: number;
  expected: number;
  earnedDelta: number | null;
}

export interface ChartPoint {
  label: string;
  conducted: number;
  cancelled: number;
  planned: number;
  rescheduled: number;
}

export interface NextLesson {
  id: string;
  startDate: string;
  endDate: string;
  child: { id: string; name: string; avatar: string | null };
  teacher: { id: string; name: string };
}

export interface ChildrenStats {
  active: number;
  newThisMonth: number;
  byCountry: { country: string; count: number }[];
}

export interface TeacherRow {
  id: string;
  name: string;
  avatar: string | null;
  lessonsCount: number;
  earned: number;
  expected: number;
  childrenCount: number;
}
```

- [ ] **Step 2: Create hooks**

```typescript
// front/src/lib/dashboard.ts
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './api';
import type {
  DashboardSummary, ChartPoint, NextLesson, ChildrenStats, TeacherRow, Period,
} from '@/types/dashboard';

export function useDashboardSummary(period: Period) {
  return useQuery({
    queryKey: ['dashboard', 'summary', period],
    queryFn: () => apiFetch<DashboardSummary>(`/dashboard/summary?period=${period}`),
  });
}

export function useDashboardChart(period: Period) {
  return useQuery({
    queryKey: ['dashboard', 'chart', period],
    queryFn: () => apiFetch<ChartPoint[]>(`/dashboard/chart?period=${period}`),
  });
}

export function useNextLesson() {
  return useQuery({
    queryKey: ['dashboard', 'next-lesson'],
    queryFn: () => apiFetch<NextLesson | null>('/dashboard/next-lesson'),
    refetchInterval: 60_000,
  });
}

export function useChildrenStats() {
  return useQuery({
    queryKey: ['dashboard', 'children-stats'],
    queryFn: () => apiFetch<ChildrenStats>('/dashboard/children-stats'),
  });
}

export function useTeachersTable(period: Period) {
  return useQuery({
    queryKey: ['dashboard', 'teachers', period],
    queryFn: () => apiFetch<TeacherRow[]>(`/dashboard/teachers?period=${period}`),
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add front/src/types/dashboard.ts front/src/lib/dashboard.ts
git commit -m "feat(frontend): dashboard types and API hooks"
```

---

## Task 10: Frontend — PeriodSwitcher component

**Files:**
- Create: `front/src/app/(admin)/dashboard/_components/PeriodSwitcher.tsx`

- [ ] **Step 1: Create component**

```tsx
// front/src/app/(admin)/dashboard/_components/PeriodSwitcher.tsx
import type { Period } from '@/types/dashboard';

const OPTIONS: { value: Period; label: string }[] = [
  { value: 'week', label: 'Тиждень' },
  { value: 'month', label: 'Місяць' },
  { value: 'year', label: 'Рік' },
];

interface PeriodSwitcherProps {
  value: Period;
  onChange: (p: Period) => void;
}

export function PeriodSwitcher({ value, onChange }: PeriodSwitcherProps) {
  return (
    <div className="inline-flex rounded-lg border bg-white overflow-hidden">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1.5 text-sm font-medium transition-colors ${
            value === opt.value
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add front/src/app/\(admin\)/dashboard/_components/PeriodSwitcher.tsx
git commit -m "feat(dashboard): PeriodSwitcher component"
```

---

## Task 11: Frontend — NextLessonCard with countdown timer

**Files:**
- Create: `front/src/app/(admin)/dashboard/_components/NextLessonCard.tsx`

- [ ] **Step 1: Create component**

```tsx
// front/src/app/(admin)/dashboard/_components/NextLessonCard.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChildAvatar } from '@/components/children/child-avatar';
import { useNextLesson } from '@/lib/dashboard';

function useCountdownMs(targetMs: number | null): number {
  const [diff, setDiff] = useState<number>(targetMs ? targetMs - Date.now() : 0);
  useEffect(() => {
    if (targetMs === null) return;
    setDiff(targetMs - Date.now());
    const id = setInterval(() => setDiff(targetMs - Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  return diff;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Зараз';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `за ${hours}г ${minutes}хв`;
  if (minutes > 0) return `за ${minutes}хв ${seconds}с`;
  return `за ${seconds}с`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
}

export function NextLessonCard() {
  const { data: lesson, isLoading } = useNextLesson();

  const startMs = lesson ? new Date(lesson.startDate).getTime() : null;
  const endMs = lesson ? new Date(lesson.endDate).getTime() : null;
  const countdown = useCountdownMs(startMs);
  const isInProgress = startMs !== null && endMs !== null && Date.now() >= startMs && Date.now() < endMs;
  const remainingMs = isInProgress && endMs ? endMs - Date.now() : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">Наступний урок</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-gray-400">Завантаження...</p>}
        {!isLoading && !lesson && (
          <p className="text-sm text-gray-400">Немає запланованих уроків</p>
        )}
        {!isLoading && lesson && (
          <div className="flex items-center gap-3">
            <ChildAvatar name={lesson.child.name} avatar={lesson.child.avatar} size={36} />
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{lesson.child.name}</p>
              <p className="text-xs text-gray-500">
                {formatDate(lesson.startDate)} · {formatTime(lesson.startDate)}
              </p>
              <p className={`text-sm font-medium mt-0.5 ${isInProgress ? 'text-green-600' : 'text-blue-600'}`}>
                {isInProgress
                  ? `Зараз · залишилось ${formatCountdown(remainingMs)}`
                  : formatCountdown(countdown)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add front/src/app/\(admin\)/dashboard/_components/NextLessonCard.tsx
git commit -m "feat(dashboard): NextLessonCard with live countdown"
```

---

## Task 12: Frontend — SummaryCard (reused for Зароблено + Очікується)

**Files:**
- Create: `front/src/app/(admin)/dashboard/_components/SummaryCard.tsx`

- [ ] **Step 1: Create component**

```tsx
// front/src/app/(admin)/dashboard/_components/SummaryCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    maximumFractionDigits: 0,
  }).format(amount);
}

interface SummaryCardProps {
  title: string;
  amount: number | undefined;
  delta?: number | null;
  isLoading?: boolean;
}

export function SummaryCard({ title, amount, delta, isLoading }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || amount === undefined ? (
          <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
        ) : (
          <>
            <p className="text-2xl font-bold">{formatCurrency(amount)}</p>
            {delta !== undefined && delta !== null && (
              <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${
                delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-gray-400'
              }`}>
                {delta > 0 ? <TrendingUp size={12} /> : delta < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                <span>{delta > 0 ? '+' : ''}{delta}% vs попередній період</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add front/src/app/\(admin\)/dashboard/_components/SummaryCard.tsx
git commit -m "feat(dashboard): SummaryCard with delta indicator"
```

---

## Task 13: Frontend — ActiveChildrenCard + ChildrenByCountry

**Files:**
- Create: `front/src/app/(admin)/dashboard/_components/ActiveChildrenCard.tsx`
- Create: `front/src/app/(admin)/dashboard/_components/ChildrenByCountry.tsx`

- [ ] **Step 1: Create ActiveChildrenCard**

```tsx
// front/src/app/(admin)/dashboard/_components/ActiveChildrenCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useChildrenStats } from '@/lib/dashboard';

export function ActiveChildrenCard() {
  const { data, isLoading } = useChildrenStats();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">Активні учні</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 w-12 bg-gray-100 rounded animate-pulse" />
        ) : (
          <>
            <p className="text-2xl font-bold">{data?.active ?? 0}</p>
            {!!data?.newThisMonth && (
              <p className="text-xs text-green-600 font-medium mt-1">
                +{data.newThisMonth} цього місяця
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create ChildrenByCountry**

```tsx
// front/src/app/(admin)/dashboard/_components/ChildrenByCountry.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCountry } from '@/lib/countries';
import { useChildrenStats } from '@/lib/dashboard';

export function ChildrenByCountry() {
  const { data, isLoading } = useChildrenStats();

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">Учні по країнах</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {isLoading && <div className="h-24 bg-gray-100 rounded animate-pulse" />}
        {!isLoading && data?.byCountry.length === 0 && (
          <p className="text-sm text-gray-400">Немає учнів</p>
        )}
        {!isLoading && data && data.byCountry.length > 0 && (
          <ul className="space-y-2">
            {data.byCountry.map(({ country, count }) => {
              const info = getCountry(country);
              return (
                <li key={country} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-base">{info?.flag ?? country}</span>
                    <span className="text-gray-700">{info?.name ?? country}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{count}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add front/src/app/\(admin\)/dashboard/_components/ActiveChildrenCard.tsx \
        front/src/app/\(admin\)/dashboard/_components/ChildrenByCountry.tsx
git commit -m "feat(dashboard): ActiveChildrenCard and ChildrenByCountry components"
```

---

## Task 14: Frontend — LessonChart (install Recharts)

**Files:**
- Create: `front/src/app/(admin)/dashboard/_components/LessonChart.tsx`

- [ ] **Step 1: Install Recharts**

```bash
cd front && npm install recharts
```
Expected: added to `dependencies` in `package.json`.

- [ ] **Step 2: Create LessonChart**

```tsx
// front/src/app/(admin)/dashboard/_components/LessonChart.tsx
'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardChart } from '@/lib/dashboard';
import type { Period } from '@/types/dashboard';

const STATUS_CONFIG = [
  { key: 'conducted',   label: 'Проведені',    color: '#22c55e' },
  { key: 'planned',     label: 'Заплановані',  color: '#3b82f6' },
  { key: 'cancelled',   label: 'Скасовані',    color: '#ef4444' },
  { key: 'rescheduled', label: 'Перенесені',   color: '#f97316' },
] as const;

interface LessonChartProps {
  period: Period;
}

export function LessonChart({ period }: LessonChartProps) {
  const { data = [], isLoading } = useDashboardChart(period);

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">Динаміка уроків</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-48 bg-gray-100 rounded animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(value: number, name: string) => {
                  const cfg = STATUS_CONFIG.find((s) => s.key === name);
                  return [value, cfg?.label ?? name];
                }}
              />
              <Legend
                formatter={(value) => STATUS_CONFIG.find((s) => s.key === value)?.label ?? value}
                wrapperStyle={{ fontSize: 11 }}
              />
              {STATUS_CONFIG.map(({ key, color }) => (
                <Bar key={key} dataKey={key} stackId="a" fill={color} radius={key === 'rescheduled' ? [3, 3, 0, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add front/src/app/\(admin\)/dashboard/_components/LessonChart.tsx \
        front/package.json front/package-lock.json
git commit -m "feat(dashboard): LessonChart stacked bar with Recharts"
```

---

## Task 15: Frontend — TeachersTable (admin only)

**Files:**
- Create: `front/src/app/(admin)/dashboard/_components/TeachersTable.tsx`

- [ ] **Step 1: Create component**

```tsx
// front/src/app/(admin)/dashboard/_components/TeachersTable.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChildAvatar } from '@/components/children/child-avatar';
import { useTeachersTable } from '@/lib/dashboard';
import type { Period } from '@/types/dashboard';

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    maximumFractionDigits: 0,
  }).format(n);
}

interface TeachersTableProps {
  period: Period;
}

export function TeachersTable({ period }: TeachersTableProps) {
  const { data = [], isLoading } = useTeachersTable(period);

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">Вчителі</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="h-24 mx-6 mb-4 bg-gray-100 rounded animate-pulse" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-500 text-xs">
                <th className="text-left px-6 py-2 font-medium">Ім'я</th>
                <th className="text-right px-4 py-2 font-medium">Уроків</th>
                <th className="text-right px-4 py-2 font-medium">Зароблено</th>
                <th className="text-right px-4 py-2 font-medium">Очікується</th>
                <th className="text-right px-6 py-2 font-medium">Учнів</th>
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <ChildAvatar name={t.name} avatar={t.avatar} size={28} />
                      <span className="font-medium">{t.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{t.lessonsCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-green-700">
                    {formatCurrency(t.earned)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-blue-700">
                    {formatCurrency(t.expected)}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums">{t.childrenCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add front/src/app/\(admin\)/dashboard/_components/TeachersTable.tsx
git commit -m "feat(dashboard): TeachersTable component"
```

---

## Task 16: Frontend — Dashboard page assembly

**Files:**
- Modify: `front/src/app/(admin)/dashboard/page.tsx` — replace with widget dashboard

- [ ] **Step 1: Replace dashboard page**

```tsx
// front/src/app/(admin)/dashboard/page.tsx
'use client';

import { useState } from 'react';
import { PeriodSwitcher } from './_components/PeriodSwitcher';
import { NextLessonCard } from './_components/NextLessonCard';
import { SummaryCard } from './_components/SummaryCard';
import { ActiveChildrenCard } from './_components/ActiveChildrenCard';
import { LessonChart } from './_components/LessonChart';
import { ChildrenByCountry } from './_components/ChildrenByCountry';
import { TeachersTable } from './_components/TeachersTable';
import { useDashboardSummary } from '@/lib/dashboard';
import { useSessionStore } from '@/store/session.store';
import type { Period } from '@/types/dashboard';

function SummaryCards({ period }: { period: Period }) {
  const { data, isLoading } = useDashboardSummary(period);
  return (
    <>
      <SummaryCard
        title="Зароблено"
        amount={data?.earned}
        delta={data?.earnedDelta}
        isLoading={isLoading}
      />
      <SummaryCard
        title="Очікується"
        amount={data?.expected}
        isLoading={isLoading}
      />
    </>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('month');
  const currentUser = useSessionStore((s) => s.user);
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Дашборд</h2>
        <PeriodSwitcher value={period} onChange={setPeriod} />
      </div>

      {/* Top row: 4 metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <NextLessonCard />
        <SummaryCards period={period} />
        <ActiveChildrenCard />
      </div>

      {/* Bottom row: chart (2/3) + country breakdown (1/3) */}
      <div className="grid grid-cols-3 gap-4">
        <LessonChart period={period} />
        <ChildrenByCountry />
      </div>

      {/* Admin-only teacher table */}
      {isAdmin && (
        <div className="grid grid-cols-1">
          <TeachersTable period={period} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Start dev server and verify in browser**

```bash
cd front && npm run dev
```

Open `http://localhost:3000/dashboard`. Verify:
- Four cards in top row (Next Lesson, Зароблено, Очікується, Активні учні)
- Bar chart below left with stacked colored bars
- Country list below right
- Teacher table at bottom (admin only)
- PeriodSwitcher updates Зароблено, Очікується, chart, and teacher table simultaneously

- [ ] **Step 3: Verify `/calendar` still works**

Navigate to `http://localhost:3000/calendar` — should show the existing week calendar with DnD and all existing functionality intact.

- [ ] **Step 4: Commit**

```bash
git add front/src/app/\(admin\)/dashboard/page.tsx
git commit -m "feat(dashboard): widget dashboard page — earnings, chart, children, teachers"
```
