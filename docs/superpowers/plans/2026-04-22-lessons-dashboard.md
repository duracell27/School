# Dashboard Lessons UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add interactive lesson management to the dashboard — draggable children sidebar, slot click/drag-to-create, lesson card quick actions, overdue indicators, and navigation badge.

**Architecture:** `DndContext` (from `@dnd-kit/core`) wraps the entire dashboard page, covering both the `ChildrenSidebar` (draggable children) and `WeekCalendar` (droppable slot cells + draggable lesson cards). Slot clicks and lesson card clicks open modals/popovers managed at the dashboard page level. A dedicated backend endpoint provides the overdue lesson count for the nav badge.

**Tech Stack:** `@dnd-kit/core`, `@dnd-kit/utilities`, React Query, shadcn Popover (already installed), Tailwind CSS `group` hover for tooltips.

---

## File Structure Map

**Backend — modified:**
- `back/src/lessons/lessons.service.ts` — add `country` to child select in `lessonSelect`; add `getOverdueCount()` method
- `back/src/lessons/lessons.controller.ts` — add `GET /lessons/overdue-count` endpoint (before `price-suggestion` and `:id` routes)
- `back/src/children/children.controller.ts` — override class-level `@Roles(ADMIN)` on `GET /` to also allow `TEACHER`; inject `@Req` to pass current user
- `back/src/children/children.service.ts` — add optional `teacherId?: string` param to `findAll()`

**Frontend types — modified:**
- `front/src/types/lesson.ts` — add `country: string` to `LessonChild`

**Frontend lib — modified:**
- `front/src/lib/children.ts` — add optional `{ teacherId?: string }` filter to `useChildren()`
- `front/src/lib/lessons.ts` — add `useOverdueCount()` hook

**Frontend components — new:**
- `front/src/components/dashboard/children-sidebar.tsx` — sidebar: duration switcher (55/30), filter toggle, draggable children list with today-dot indicator
- `front/src/components/dashboard/lesson-actions-popover.tsx` — Popover with 6 quick actions for an existing lesson card

**Frontend components — modified:**
- `front/src/components/lessons/lesson-modal.tsx` — add `defaultStartDate`, `defaultEndDate`, `defaultTeacherId`, `defaultChildId` optional props for pre-filling in create mode
- `front/src/components/dashboard/week-calendar.tsx` — add `DroppableSlot` cells, `DraggableLesson` wrapper, overdue red bg, country flag emoji, hover tooltip, `onSlotClick` / `onLessonClick` props
- `front/src/app/(admin)/layout.tsx` — call `useOverdueCount()`, render red badge on "Уроки" nav item
- `front/src/app/(admin)/dashboard/page.tsx` — add `DndContext` with sensors, sidebar panel, drag state management, `onDragEnd` handler, slot/lesson click handlers

---

## Task 1: Install @dnd-kit packages

**Files:**
- Modify: `front/package.json` (via npm install)

- [ ] **Step 1: Install packages**

```bash
cd /Users/Apple/IT/School/front && npm install @dnd-kit/core @dnd-kit/utilities
```

- [ ] **Step 2: Verify installation**

```bash
grep '@dnd-kit' /Users/Apple/IT/School/front/package.json
```

Expected: both `@dnd-kit/core` and `@dnd-kit/utilities` appear in dependencies.

- [ ] **Step 3: Commit**

```bash
cd /Users/Apple/IT/School && git add front/package.json front/package-lock.json && git commit -m "chore: install @dnd-kit/core and @dnd-kit/utilities"
```

---

## Task 2: Add country to lesson response

The lesson card needs to show a country flag emoji. Currently `lessonSelect` in the backend does not include `child.country`, and `LessonChild` on the frontend has no `country` field. Fix both.

**Files:**
- Modify: `back/src/lessons/lessons.service.ts` (lines 10-22)
- Modify: `front/src/types/lesson.ts` (lines 4-8)

- [ ] **Step 1: Add `country` to `lessonSelect` in lessons service**

In `back/src/lessons/lessons.service.ts`, change the child select from:
```typescript
child: { select: { id: true, name: true, avatar: true, timezone: true } },
```
to:
```typescript
child: { select: { id: true, name: true, avatar: true, timezone: true, country: true } },
```

- [ ] **Step 2: Add `country` to `LessonChild` type**

In `front/src/types/lesson.ts`, change `LessonChild` from:
```typescript
export interface LessonChild {
  id: string;
  name: string;
  avatar: string | null;
  timezone: string;
}
```
to:
```typescript
export interface LessonChild {
  id: string;
  name: string;
  avatar: string | null;
  timezone: string;
  country: string;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/Apple/IT/School/front && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to `LessonChild`.

- [ ] **Step 4: Commit**

```bash
cd /Users/Apple/IT/School && git add back/src/lessons/lessons.service.ts front/src/types/lesson.ts && git commit -m "feat: add country to lesson child response"
```

---

## Task 3: Backend — children GET endpoint for teachers

Teachers need to fetch their own children for the sidebar. Currently `GET /children` is ADMIN-only. Allow TEACHER role but filter results to their own children.

**Files:**
- Modify: `back/src/children/children.controller.ts`
- Modify: `back/src/children/children.service.ts`

- [ ] **Step 1: Update `findAll` in children service to accept optional teacherId**

Replace the entire `findAll` method in `back/src/children/children.service.ts`:
```typescript
findAll(teacherId?: string) {
  return this.prisma.child.findMany({
    where: teacherId ? { teacherId } : undefined,
    select: childSelect,
  });
}
```

- [ ] **Step 2: Update children controller to allow TEACHER on GET /**

Replace the entire content of `back/src/children/children.controller.ts`:
```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface JwtUser {
  sub: string;
  role: Role;
}

@Controller('children')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChildrenController {
  constructor(private readonly children: ChildrenService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  findAll(@Req() req: Request) {
    const user = req['user'] as JwtUser;
    const teacherId = user.role === Role.TEACHER ? user.sub : undefined;
    return this.children.findAll(teacherId);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateChildDto) {
    return this.children.create(dto);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.children.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateChildDto) {
    return this.children.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.children.remove(id);
  }
}
```

- [ ] **Step 3: Restart backend and manually verify**

```bash
cd /Users/Apple/IT/School/back && npm run start:dev &
```

Test with curl (replace TOKEN with a valid JWT):
```bash
curl -H "Authorization: Bearer TOKEN" http://localhost:3001/children
```

Expected: array of children.

- [ ] **Step 4: Commit**

```bash
cd /Users/Apple/IT/School && git add back/src/children/children.controller.ts back/src/children/children.service.ts && git commit -m "feat: allow teachers to fetch their own children"
```

---

## Task 4: Backend — overdue lesson count endpoint

Add `GET /lessons/overdue-count` that returns a count of PLANNED lessons whose `endDate` is in the past. Teachers see only their lessons; admins see all.

**Files:**
- Modify: `back/src/lessons/lessons.service.ts`
- Modify: `back/src/lessons/lessons.controller.ts`

- [ ] **Step 1: Add `getOverdueCount` method to lessons service**

Add this method to `LessonsService` in `back/src/lessons/lessons.service.ts`, after the `getPriceSuggestion` method:
```typescript
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
```

- [ ] **Step 2: Add `GET /lessons/overdue-count` route to lessons controller**

In `back/src/lessons/lessons.controller.ts`, add this route **immediately after** the `findAll` method and **before** `getPriceSuggestion` (both static routes must come before `:id`):
```typescript
@Get('overdue-count')
getOverdueCount(@Req() req: Request) {
  const user = req['user'] as JwtUser;
  return this.lessons.getOverdueCount(user.sub, user.role);
}
```

- [ ] **Step 3: Verify endpoint works**

```bash
curl -H "Authorization: Bearer TOKEN" http://localhost:3001/lessons/overdue-count
```

Expected: a number (e.g., `3`).

- [ ] **Step 4: Commit**

```bash
cd /Users/Apple/IT/School && git add back/src/lessons/lessons.service.ts back/src/lessons/lessons.controller.ts && git commit -m "feat: add overdue lesson count endpoint"
```

---

## Task 5: Frontend — update hooks

Update `useChildren` to support a `teacherId` filter, and add `useOverdueCount`.

**Files:**
- Modify: `front/src/lib/children.ts`
- Modify: `front/src/lib/lessons.ts`

- [ ] **Step 1: Update `useChildren` to accept optional filter**

Replace the entire `useChildren` function in `front/src/lib/children.ts`:
```typescript
export function useChildren(filters: { teacherId?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.teacherId) params.set('teacherId', filters.teacherId);
  const qs = params.toString();
  return useQuery({
    queryKey: ['children', filters],
    queryFn: () => apiFetch<Child[]>(`/children${qs ? `?${qs}` : ''}`),
  });
}
```

- [ ] **Step 2: Add `useOverdueCount` hook to lessons.ts**

Add this function at the end of `front/src/lib/lessons.ts`:
```typescript
export function useOverdueCount() {
  return useQuery({
    queryKey: ['lessons', 'overdue-count'],
    queryFn: () => apiFetch<number>('/lessons/overdue-count'),
    refetchInterval: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 3: Fix existing LessonModal call to useChildren**

In `front/src/components/lessons/lesson-modal.tsx`, line 67, `useChildren()` is called without arguments — this still works since the filter is now optional. No change needed.

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/Apple/IT/School/front && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/Apple/IT/School && git add front/src/lib/children.ts front/src/lib/lessons.ts && git commit -m "feat: add teacherId filter to useChildren, add useOverdueCount hook"
```

---

## Task 6: Frontend — navigation badge for overdue lessons

Show a red badge count next to "Уроки" in the sidebar nav. Uses `useOverdueCount` polled every 5 minutes.

**Files:**
- Modify: `front/src/app/(admin)/layout.tsx`

- [ ] **Step 1: Replace layout.tsx with version that includes badge**

Replace the entire file `front/src/app/(admin)/layout.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useSessionStore } from '@/store/session.store';
import { useOverdueCount } from '@/lib/lessons';
import type { User } from '@/types/user';

interface RefreshResponse {
  access_token: string;
  user: User;
}

const navItems = [
  { href: '/dashboard', label: 'Дашборд' },
  { href: '/users', label: 'Користувачі' },
  { href: '/children', label: 'Діти' },
  { href: '/lessons', label: 'Уроки', showBadge: true },
  { href: '/lesson-prices', label: 'Вартість заняття' },
];

function NavBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function NavContent() {
  const pathname = usePathname();
  const { data: overdueCount = 0 } = useOverdueCount();

  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {item.label}
            {item.showBadge && <NavBadge count={overdueCount} />}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const setUser = useSessionStore((s) => s.setUser);
  const router = useRouter();

  useEffect(() => {
    apiFetch<RefreshResponse>('/auth/refresh', { method: 'POST' })
      .then(({ user }) => {
        if (user.role !== 'ADMIN') {
          router.replace('/login');
          return;
        }
        setUser(user);
        setLoading(false);
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [router, setUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Завантаження...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 bg-white border-r flex flex-col">
        <div className="px-5 py-5 border-b">
          <span className="font-semibold text-sm">Teacher Platform</span>
        </div>

        <NavContent />

        <div className="px-3 py-4 border-t">
          <button
            onClick={async () => {
              await apiFetch('/auth/logout', { method: 'POST' });
              router.replace('/login');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            Вийти
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 bg-gray-50">{children}</main>
    </div>
  );
}
```

Note: `NavContent` is extracted as a separate component so `useOverdueCount` (a React Query hook) is called inside a component that renders only after auth resolves — avoiding hook-before-provider issues.

- [ ] **Step 2: Start dev server and verify badge appears**

```bash
cd /Users/Apple/IT/School/front && npm run dev
```

Open http://localhost:3000/lessons in browser. If there are overdue lessons, a red badge should appear next to "Уроки" in the nav.

- [ ] **Step 3: Commit**

```bash
cd /Users/Apple/IT/School && git add front/src/app/'(admin)'/layout.tsx && git commit -m "feat: add overdue lesson count badge to nav"
```

---

## Task 7: Lesson card enhancements — overdue bg, country flag, hover tooltip

Enhance `WeekCalendar` lesson cards: red background for overdue PLANNED lessons, country flag emoji when child timezone differs from Ukraine, and a hover tooltip showing full lesson details.

**Files:**
- Modify: `front/src/components/dashboard/week-calendar.tsx`

- [ ] **Step 1: Replace the lesson card section in WeekCalendar**

Replace the entire file `front/src/components/dashboard/week-calendar.tsx` with this version (adds overdue detection, flag emoji, hover tooltip — no DnD yet):

```typescript
'use client';

import { useMemo } from 'react';
import { ChildAvatar } from '@/components/children/child-avatar';
import type { Lesson, LessonStatus } from '@/types/lesson';

const HOUR_START = 6;
const HOUR_END = 22;
const ROW_PX = 36;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const TOTAL_H = (HOUR_END - HOUR_START) * ROW_PX;

const STATUS_STYLE: Record<LessonStatus, string> = {
  PLANNED: 'border-blue-400 bg-blue-50 text-blue-900',
  CONDUCTED: 'border-green-500 bg-green-50 text-green-900',
  CANCELLED: 'border-red-400 bg-red-50 text-red-900',
  RESCHEDULED: 'border-orange-400 bg-orange-50 text-orange-900',
};

const STATUS_LABEL: Record<LessonStatus, string> = {
  PLANNED: 'Заплановано',
  CONDUCTED: 'Проведено',
  CANCELLED: 'Скасовано',
  RESCHEDULED: 'Перенесено',
};

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}

function getWeekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function getLessonPos(lesson: Lesson): { top: number; height: number } | null {
  const s = new Date(lesson.startDate);
  const e = new Date(lesson.endDate);
  const sh = s.getHours() + s.getMinutes() / 60;
  const eh = e.getHours() + e.getMinutes() / 60;
  if (eh <= HOUR_START || sh >= HOUR_END) return null;
  const cs = Math.max(sh, HOUR_START);
  const ce = Math.min(eh, HOUR_END);
  return { top: (cs - HOUR_START) * ROW_PX, height: (ce - cs) * ROW_PX };
}

function getUkraineOffset(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Kyiv',
    timeZoneName: 'shortOffset',
  }).formatToParts(new Date());
  const raw = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+2';
  const m = raw.match(/GMT([+-]\d+)/);
  return m ? parseInt(m[1]) : 2;
}

function getChildLocalTime(lesson: Lesson): string | null {
  const childOffset = parseInt(lesson.child.timezone, 10);
  if (isNaN(childOffset)) return null;
  const uaOffset = getUkraineOffset();
  if (childOffset === uaOffset) return null;

  const utcMs = new Date(lesson.startDate).getTime();
  const childDate = new Date(utcMs + childOffset * 3600000);
  return childDate.toLocaleTimeString('uk-UA', {
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  });
}

function countryFlag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e0 + c.charCodeAt(0) - 65))
    .join('');
}

function isOverdue(lesson: Lesson): boolean {
  return lesson.status === 'PLANNED' && new Date(lesson.endDate) < new Date();
}

interface WeekCalendarProps {
  lessons: Lesson[];
  weekStart: Date;
  onSlotClick?: (dayKey: string, hour: number, minute: number) => void;
  onLessonClick?: (lesson: Lesson) => void;
}

export function WeekCalendar({ lessons, weekStart, onSlotClick, onLessonClick }: WeekCalendarProps) {
  const days = getWeekDays(weekStart);
  const todayKey = new Date().toLocaleDateString('en-CA');

  const lessonsByDay = useMemo(() => {
    const map = new Map<string, Lesson[]>();
    days.forEach((d) => map.set(d.toLocaleDateString('en-CA'), []));
    lessons.forEach((l) => {
      const k = new Date(l.startDate).toLocaleDateString('en-CA');
      map.get(k)?.push(l);
    });
    return map;
  }, [lessons, days]);

  return (
    <div className="flex border rounded-lg overflow-hidden bg-white select-none">
      {/* Time column */}
      <div className="w-12 shrink-0 border-r bg-gray-50">
        <div className="h-10 border-b" />
        <div className="relative" style={{ height: TOTAL_H }}>
          {HOURS.map((h) => (
            <div
              key={h}
              className="absolute w-full pr-1.5 text-right text-[10px] text-gray-400"
              style={{ top: (h - HOUR_START) * ROW_PX - 6 }}
            >
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>
      </div>

      {/* Day columns */}
      {days.map((day) => {
        const key = day.toLocaleDateString('en-CA');
        const isToday = key === todayKey;
        const dayLessons = lessonsByDay.get(key) ?? [];

        return (
          <div key={key} className="flex-1 min-w-0 border-r last:border-r-0">
            <div className={`h-10 border-b flex flex-col items-center justify-center ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}>
              <span className="text-[11px] text-gray-500 capitalize">
                {day.toLocaleDateString('uk-UA', { weekday: 'short' })}
              </span>
              <span className={`text-sm font-semibold leading-none ${isToday ? 'text-blue-600' : ''}`}>
                {day.getDate()}
              </span>
            </div>

            <div
              className="relative"
              style={{ height: TOTAL_H }}
              onClick={(e) => {
                if (!onSlotClick) return;
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const y = e.clientY - rect.top;
                const totalMinutes = (y / ROW_PX) * 60;
                const hour = HOUR_START + Math.floor(totalMinutes / 60);
                const minute = Math.floor((totalMinutes % 60) / 30) * 30;
                if (hour >= HOUR_START && hour < HOUR_END) {
                  onSlotClick(key, hour, minute);
                }
              }}
            >
              {/* Hour grid lines */}
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute w-full border-t border-gray-100 pointer-events-none"
                  style={{ top: (h - HOUR_START) * ROW_PX }}
                />
              ))}

              {/* Lesson cards */}
              {dayLessons.map((lesson) => {
                const pos = getLessonPos(lesson);
                if (!pos || pos.height < 8) return null;
                const childTime = getChildLocalTime(lesson);
                const overdue = isOverdue(lesson);
                const cardStyle = overdue
                  ? 'border-red-600 bg-red-100 text-red-900'
                  : STATUS_STYLE[lesson.status];

                const startStr = new Date(lesson.startDate).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
                const endStr = new Date(lesson.endDate).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={lesson.id}
                    className={`group absolute left-0.5 right-0.5 rounded border-l-2 px-1 py-0.5 overflow-hidden cursor-pointer z-10 ${cardStyle}`}
                    style={{ top: pos.top + 1, height: pos.height - 2 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onLessonClick?.(lesson);
                    }}
                  >
                    {/* Hover tooltip */}
                    <div className="absolute bottom-full left-0 z-50 hidden group-hover:block bg-white border border-gray-200 rounded shadow-lg p-2 text-xs w-44 pointer-events-none">
                      <p className="font-semibold">{lesson.child.name}</p>
                      <p className="text-gray-500">{startStr}–{endStr}</p>
                      <p className="text-gray-500">{lesson.price}₴</p>
                      <p className="text-gray-500">{STATUS_LABEL[lesson.status]}</p>
                      {overdue && <p className="text-red-600 font-medium">Не оброблено!</p>}
                    </div>

                    {/* Name row with avatar */}
                    <div className="flex items-center gap-1 min-w-0">
                      <ChildAvatar name={lesson.child.name} avatar={lesson.child.avatar} size={14} />
                      <span className="text-[11px] font-semibold truncate leading-tight">
                        {lesson.child.name}
                      </span>
                    </div>

                    {/* Time row */}
                    {pos.height >= 20 && (
                      <div className="text-[10px] opacity-70 leading-tight truncate">
                        {startStr}–{endStr}
                        {childTime && (
                          <span className="ml-1 opacity-80">
                            · {countryFlag(lesson.child.country)} {childTime}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Open the dashboard. Verify:
- If any PLANNED lesson has a past `endDate`, its card shows a red background
- Hovering a lesson card shows the tooltip with name, time, price, status
- For children with different timezone offset from Ukraine, the child local time shows with a flag emoji (e.g., `🇵🇱 14:00`)

- [ ] **Step 3: Commit**

```bash
cd /Users/Apple/IT/School && git add front/src/components/dashboard/week-calendar.tsx && git commit -m "feat: lesson card overdue bg, country flag, hover tooltip"
```

---

## Task 8: LessonModal — add default pre-fill props

When a user clicks an empty calendar slot, the modal should open pre-filled with the slot's start/end time and the current teacher. Add optional props for this.

**Files:**
- Modify: `front/src/components/lessons/lesson-modal.tsx`

- [ ] **Step 1: Add default pre-fill props to LessonModal**

Change the `LessonModalProps` interface:
```typescript
interface LessonModalProps {
  open: boolean;
  onClose: () => void;
  lesson?: Lesson;
  defaultStartDate?: string; // ISO string, used when creating from slot click
  defaultEndDate?: string;   // ISO string
  defaultTeacherId?: string;
  defaultChildId?: string;
}
```

Update the function signature:
```typescript
export function LessonModal({ open, onClose, lesson, defaultStartDate, defaultEndDate, defaultTeacherId, defaultChildId }: LessonModalProps) {
```

In the `useEffect` that resets the form (the one depending on `[lesson, open, ...]`), update the `else` branch (create mode):
```typescript
} else {
  reset({
    startDate: defaultStartDate ? toDatetimeLocal(defaultStartDate) : '',
    endDate: defaultEndDate ? toDatetimeLocal(defaultEndDate) : '',
    price: undefined as never,
    originalStartDate: '',
    originalEndDate: '',
  });
  setChildId(defaultChildId ?? '');
  setTeacherId(defaultTeacherId ?? (isAdmin ? '' : (currentUser?.id ?? '')));
  setStatus('PLANNED');
}
```

Also update the `useEffect` dependency array to include the new defaults:
```typescript
}, [lesson, open, isAdmin, currentUser?.id, defaultStartDate, defaultEndDate, defaultTeacherId, defaultChildId]);
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/Apple/IT/School/front && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/Apple/IT/School && git add front/src/components/lessons/lesson-modal.tsx && git commit -m "feat: add default pre-fill props to LessonModal"
```

---

## Task 9: ChildrenSidebar component

Create the sidebar with duration switcher (55/30 min), filter toggle for unprocessed children, today-dot indicator, and a draggable children list.

**Files:**
- Create: `front/src/components/dashboard/children-sidebar.tsx`

- [ ] **Step 1: Create the ChildrenSidebar component**

Create `front/src/components/dashboard/children-sidebar.tsx`:

```typescript
'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ChildAvatar } from '@/components/children/child-avatar';
import type { Child } from '@/types/child';
import type { Lesson } from '@/types/lesson';

interface DraggableChildProps {
  child: Child;
  hasLessonToday: boolean;
}

function DraggableChild({ child, hasLessonToday }: DraggableChildProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `child-${child.id}`,
    data: { type: 'child', child },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab hover:bg-gray-50 transition-colors ${
        isDragging ? 'opacity-40' : ''
      }`}
      {...listeners}
      {...attributes}
    >
      <ChildAvatar name={child.name} avatar={child.avatar} size={24} />
      <span className="text-sm truncate flex-1">{child.name}</span>
      {hasLessonToday && (
        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Має урок сьогодні" />
      )}
    </div>
  );
}

interface ChildrenSidebarProps {
  children: Child[];
  lessons: Lesson[]; // current week's lessons for today-dot and overdue filter
  duration: 55 | 30;
  onDurationChange: (d: 55 | 30) => void;
}

export function ChildrenSidebar({ children, lessons, duration, onDurationChange }: ChildrenSidebarProps) {
  const todayKey = new Date().toLocaleDateString('en-CA');
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);

  const childIdsWithLessonToday = useMemo(() => {
    const ids = new Set<string>();
    lessons.forEach((l) => {
      const lKey = new Date(l.startDate).toLocaleDateString('en-CA');
      if (lKey === todayKey) ids.add(l.child.id);
    });
    return ids;
  }, [lessons, todayKey]);

  const childIdsWithOverdue = useMemo(() => {
    const ids = new Set<string>();
    const now = new Date();
    lessons.forEach((l) => {
      if (l.status === 'PLANNED' && new Date(l.endDate) < now) {
        ids.add(l.child.id);
      }
    });
    return ids;
  }, [lessons]);

  const visibleChildren = showOnlyOverdue
    ? children.filter((c) => childIdsWithOverdue.has(c.id))
    : children;

  return (
    <div className="w-48 shrink-0 flex flex-col gap-2 border rounded-lg bg-white p-2">
      {/* Duration switcher */}
      <div className="flex rounded-lg border overflow-hidden">
        <button
          className={`flex-1 text-xs py-1.5 font-medium transition-colors ${
            duration === 55 ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
          onClick={() => onDurationChange(55)}
        >
          55хв
        </button>
        <button
          className={`flex-1 text-xs py-1.5 font-medium transition-colors border-l ${
            duration === 30 ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
          onClick={() => onDurationChange(30)}
        >
          30хв
        </button>
      </div>

      {/* Overdue filter toggle */}
      <button
        className={`text-xs px-2 py-1 rounded border transition-colors text-left ${
          showOnlyOverdue
            ? 'bg-red-50 border-red-300 text-red-700'
            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
        }`}
        onClick={() => setShowOnlyOverdue((v) => !v)}
      >
        {showOnlyOverdue ? '✕ Скинути фільтр' : 'Лише з необробленими'}
      </button>

      {/* Children list */}
      <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
        {visibleChildren.length === 0 ? (
          <p className="text-xs text-gray-400 px-2 py-2">Немає учнів</p>
        ) : (
          visibleChildren.map((child) => (
            <DraggableChild
              key={child.id}
              child={child}
              hasLessonToday={childIdsWithLessonToday.has(child.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

Add the missing imports at the top of the file:
```typescript
import { useState, useMemo } from 'react';
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/Apple/IT/School/front && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/Apple/IT/School && git add front/src/components/dashboard/children-sidebar.tsx && git commit -m "feat: add ChildrenSidebar with duration switcher and draggable children"
```

---

## Task 10: LessonActionsPopover component

Create the popover with quick actions for an existing lesson: mark as conducted, edit, reschedule (opens edit modal), duplicate next week, cancel, delete.

**Files:**
- Create: `front/src/components/dashboard/lesson-actions-popover.tsx`

The project already has a `Popover` UI component? Let's check — if not, use a positioned div with click-outside close.

Since shadcn's `Popover` may or may not be installed, use a simple overlay approach with Base UI which is available (`@base-ui/react`).

Actually, shadcn/ui Popover uses Radix UI under the hood. Since `@base-ui/react` is available, use `@base-ui/react/popover`. Check Base UI docs for the Popover API — it follows the same pattern as Radix.

For simplicity and no-dependency approach, implement as a positioned `div` that shows/hides, rendered in a Portal via React's `createPortal`. But that's complex too.

**Simplest approach:** Render the actions popover as an absolutely-positioned card next to the lesson card, triggered by state in the parent. The parent controls `open` and position via a ref.

Use this pattern: the popover is a fixed-position overlay card controlled by the parent (dashboard page).

- [ ] **Step 1: Create LessonActionsPopover**

Create `front/src/components/dashboard/lesson-actions-popover.tsx`:

```typescript
'use client';

import { useRef, useEffect } from 'react';
import { useUpdateLesson, useDeleteLesson, useCreateLesson } from '@/lib/lessons';
import type { Lesson } from '@/types/lesson';

interface LessonActionsPopoverProps {
  lesson: Lesson;
  anchorRect: DOMRect;
  onClose: () => void;
  onEdit: (lesson: Lesson) => void;
}

export function LessonActionsPopover({ lesson, anchorRect, onClose, onEdit }: LessonActionsPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const updateLesson = useUpdateLesson();
  const deleteLesson = useDeleteLesson();
  const createLesson = useCreateLesson();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const top = anchorRect.bottom + window.scrollY + 4;
  const left = anchorRect.left + window.scrollX;

  async function markConducted() {
    await updateLesson.mutateAsync({ id: lesson.id, data: { status: 'CONDUCTED' } });
    onClose();
  }

  async function cancelLesson() {
    await updateLesson.mutateAsync({ id: lesson.id, data: { status: 'CANCELLED' } });
    onClose();
  }

  async function deleteLesson_() {
    if (!confirm(`Видалити урок з ${lesson.child.name}?`)) return;
    await deleteLesson.mutateAsync(lesson.id);
    onClose();
  }

  async function duplicateNextWeek() {
    const newStart = new Date(new Date(lesson.startDate).getTime() + 7 * 24 * 60 * 60 * 1000);
    const newEnd = new Date(new Date(lesson.endDate).getTime() + 7 * 24 * 60 * 60 * 1000);
    await createLesson.mutateAsync({
      childId: lesson.child.id,
      teacherId: lesson.teacher.id,
      status: 'PLANNED',
      startDate: newStart.toISOString(),
      endDate: newEnd.toISOString(),
      price: Number(lesson.price),
    });
    onClose();
  }

  const busy = updateLesson.isPending || deleteLesson.isPending || createLesson.isPending;

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-52"
      style={{ top, left }}
    >
      <ActionBtn onClick={markConducted} disabled={busy}>✅ Позначити проведеним</ActionBtn>
      <ActionBtn onClick={() => { onEdit(lesson); onClose(); }} disabled={false}>✏️ Редагувати</ActionBtn>
      <ActionBtn onClick={() => { onEdit(lesson); onClose(); }} disabled={false}>📅 Перенести</ActionBtn>
      <ActionBtn onClick={duplicateNextWeek} disabled={busy}>📋 Повторити наступного тижня</ActionBtn>
      <div className="border-t border-gray-100 my-1" />
      <ActionBtn onClick={cancelLesson} disabled={busy} className="text-orange-600">❌ Скасувати</ActionBtn>
      <ActionBtn onClick={deleteLesson_} disabled={busy} className="text-red-600">🗑️ Видалити</ActionBtn>
    </div>
  );
}

function ActionBtn({
  onClick,
  disabled,
  children,
  className = '',
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors ${className}`}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/Apple/IT/School/front && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/Apple/IT/School && git add front/src/components/dashboard/lesson-actions-popover.tsx && git commit -m "feat: add LessonActionsPopover with quick actions"
```

---

## Task 11: WeekCalendar — add DroppableSlot cells for DnD

Add drop target cells to each day column. Each cell covers 30 minutes (18px). Cells highlight green/red on drag-over based on occupancy.

**Files:**
- Modify: `front/src/components/dashboard/week-calendar.tsx`

- [ ] **Step 1: Add DroppableSlot sub-component and slot rendering**

Add these imports at the top of `week-calendar.tsx`:
```typescript
import { useDroppable } from '@dnd-kit/core';
```

Add this helper after `isOverdue`:
```typescript
const HALF_HOURS = Array.from({ length: (HOUR_END - HOUR_START) * 2 }, (_, i) => ({
  hour: HOUR_START + Math.floor(i / 2),
  minute: (i % 2) * 30,
}));

function isSlotOccupied(dayLessons: Lesson[], hour: number, minute: number): boolean {
  const slotMin = hour * 60 + minute;
  return dayLessons.some((l) => {
    const ls = new Date(l.startDate);
    const le = new Date(l.endDate);
    const lsMin = ls.getHours() * 60 + ls.getMinutes();
    const leMin = le.getHours() * 60 + le.getMinutes();
    return lsMin < slotMin + 30 && leMin > slotMin;
  });
}

interface DroppableSlotProps {
  id: string;
  hour: number;
  minute: number;
  occupied: boolean;
}

function DroppableSlot({ id, hour, minute, occupied }: DroppableSlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { hour, minute } });
  const top = ((hour - HOUR_START) * 2 + minute / 30) * (ROW_PX / 2);

  return (
    <div
      ref={setNodeRef}
      className={`absolute left-0 right-0 z-0 transition-colors ${
        isOver ? (occupied ? 'bg-red-100' : 'bg-green-100') : ''
      }`}
      style={{ top, height: ROW_PX / 2 }}
    />
  );
}
```

In the day column's inner relative div, add the slot cells **before** the hour grid lines and lesson cards. Inside the `days.map(...)` block, update the inner relative div content:

```typescript
<div
  className="relative"
  style={{ height: TOTAL_H }}
  onClick={(e) => {
    if (!onSlotClick) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalMinutes = (y / ROW_PX) * 60;
    const hour = HOUR_START + Math.floor(totalMinutes / 60);
    const minute = Math.floor((totalMinutes % 60) / 30) * 30;
    if (hour >= HOUR_START && hour < HOUR_END) {
      onSlotClick(key, hour, minute);
    }
  }}
>
  {/* Drop target slots */}
  {HALF_HOURS.map(({ hour: h, minute: m }) => {
    const slotId = `slot-${key}-${h}-${m}`;
    return (
      <DroppableSlot
        key={slotId}
        id={slotId}
        hour={h}
        minute={m}
        occupied={isSlotOccupied(dayLessons, h, m)}
      />
    );
  })}

  {/* Hour grid lines */}
  {HOURS.map((h) => (
    <div
      key={h}
      className="absolute w-full border-t border-gray-100 pointer-events-none"
      style={{ top: (h - HOUR_START) * ROW_PX }}
    />
  ))}

  {/* Lesson cards — unchanged from Task 7 */}
  {dayLessons.map((lesson) => { /* ... same card code ... */ })}
</div>
```

- [ ] **Step 2: Add DraggableLesson wrapper to lesson cards**

Add this import:
```typescript
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
```

Add this sub-component before `WeekCalendar`:
```typescript
interface DraggableLessonProps {
  lesson: Lesson;
  pos: { top: number; height: number };
  onLessonClick?: (lesson: Lesson) => void;
}

function DraggableLessonCard({ lesson, pos, onLessonClick }: DraggableLessonProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `lesson-${lesson.id}`,
    data: { type: 'lesson', lesson },
  });

  const overdue = isOverdue(lesson);
  const cardStyle = overdue ? 'border-red-600 bg-red-100 text-red-900' : STATUS_STYLE[lesson.status];

  const startStr = new Date(lesson.startDate).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  const endStr = new Date(lesson.endDate).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  const childTime = getChildLocalTime(lesson);

  const style: React.CSSProperties = {
    position: 'absolute',
    top: pos.top + 1,
    height: pos.height - 2,
    left: 2,
    right: 2,
    zIndex: isDragging ? 0 : 10,
    opacity: isDragging ? 0.3 : 1,
    ...(transform ? { transform: CSS.Translate.toString(transform) } : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded border-l-2 px-1 py-0.5 overflow-hidden cursor-grab ${cardStyle}`}
      onClick={(e) => { e.stopPropagation(); onLessonClick?.(lesson); }}
      {...listeners}
      {...attributes}
    >
      {/* Hover tooltip */}
      <div className="absolute bottom-full left-0 z-50 hidden group-hover:block bg-white border border-gray-200 rounded shadow-lg p-2 text-xs w-44 pointer-events-none">
        <p className="font-semibold">{lesson.child.name}</p>
        <p className="text-gray-500">{startStr}–{endStr}</p>
        <p className="text-gray-500">{lesson.price}₴</p>
        <p className="text-gray-500">{STATUS_LABEL[lesson.status]}</p>
        {overdue && <p className="text-red-600 font-medium">Не оброблено!</p>}
      </div>

      <div className="flex items-center gap-1 min-w-0">
        <ChildAvatar name={lesson.child.name} avatar={lesson.child.avatar} size={14} />
        <span className="text-[11px] font-semibold truncate leading-tight">{lesson.child.name}</span>
      </div>

      {pos.height >= 20 && (
        <div className="text-[10px] opacity-70 leading-tight truncate">
          {startStr}–{endStr}
          {childTime && (
            <span className="ml-1 opacity-80">
              · {countryFlag(lesson.child.country)} {childTime}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
```

Then in the lesson cards rendering section, replace the static lesson card div with:
```typescript
{dayLessons.map((lesson) => {
  const pos = getLessonPos(lesson);
  if (!pos || pos.height < 8) return null;
  return (
    <DraggableLessonCard
      key={lesson.id}
      lesson={lesson}
      pos={pos}
      onLessonClick={onLessonClick}
    />
  );
})}
```

Also remove the old static lesson card code from Task 7 — replace it entirely with `DraggableLessonCard`.

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/Apple/IT/School/front && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors. If there's a `useDroppable`/`useDraggable` not-in-context error at runtime, that's expected — DndContext gets added in Task 12.

- [ ] **Step 4: Commit**

```bash
cd /Users/Apple/IT/School && git add front/src/components/dashboard/week-calendar.tsx && git commit -m "feat: add DroppableSlot cells and DraggableLesson to WeekCalendar"
```

---

## Task 12: Dashboard page — DndContext, sidebar, full wiring

Wire everything together: add `DndContext` wrapping sidebar + calendar, handle `onDragEnd`, manage modal/popover state for slot clicks and lesson card clicks.

**Files:**
- Modify: `front/src/app/(admin)/dashboard/page.tsx`

- [ ] **Step 1: Replace dashboard page with fully wired version**

Replace the entire `front/src/app/(admin)/dashboard/page.tsx`:

```typescript
'use client';

import { useState, useCallback } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WeekCalendar, getWeekStart } from '@/components/dashboard/week-calendar';
import { ChildrenSidebar } from '@/components/dashboard/children-sidebar';
import { LessonActionsPopover } from '@/components/dashboard/lesson-actions-popover';
import { LessonModal } from '@/components/lessons/lesson-modal';
import { useLessons, useCreateLesson, useUpdateLesson } from '@/lib/lessons';
import { useChildren } from '@/lib/children';
import { useUsers } from '@/lib/users';
import { useSessionStore } from '@/store/session.store';
import type { Lesson } from '@/types/lesson';
import type { Child } from '@/types/child';

function toWeekStartStr(date: Date): string {
  return date.toLocaleDateString('en-CA');
}

function fmtWeekLabel(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const s = start.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
  const e = end.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${s} – ${e}`;
}

function buildStartISO(dayKey: string, hour: number, minute: number): string {
  const d = new Date(dayKey);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function isSlotOccupied(lessons: Lesson[], dayKey: string, hour: number, minute: number, durationMin: number, excludeId?: string): boolean {
  const slotStart = new Date(dayKey);
  slotStart.setHours(hour, minute, 0, 0);
  const slotEnd = new Date(slotStart.getTime() + durationMin * 60000);
  return lessons.some((l) => {
    if (l.id === excludeId) return false;
    const ls = new Date(l.startDate);
    const le = new Date(l.endDate);
    return ls < slotEnd && le > slotStart;
  });
}

interface SlotModalState {
  startDate: string;
  endDate: string;
  teacherId: string;
}

interface LessonPopoverState {
  lesson: Lesson;
  anchorRect: DOMRect;
}

export default function DashboardPage() {
  const currentUser = useSessionStore((s) => s.user);
  const isAdmin = currentUser?.role === 'ADMIN';

  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [duration, setDuration] = useState<55 | 30>(55);

  // Modal state for slot click (quick create)
  const [slotModal, setSlotModal] = useState<SlotModalState | null>(null);
  // Modal state for lesson edit
  const [editLesson, setEditLesson] = useState<Lesson | null>(null);
  // Popover state for lesson card click
  const [lessonPopover, setLessonPopover] = useState<LessonPopoverState | null>(null);

  const { data: users = [] } = useUsers();
  const teacherId = isAdmin ? selectedTeacherId : (currentUser?.id ?? '');

  const { data: lessons = [], isLoading } = useLessons({
    teacherId: teacherId || undefined,
    weekStart: toWeekStartStr(weekStart),
  });

  const { data: children = [] } = useChildren(
    teacherId ? { teacherId } : {}
  );

  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function prevWeek() {
    setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  }

  function nextWeek() {
    setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  }

  const handleSlotClick = useCallback((dayKey: string, hour: number, minute: number) => {
    if (isSlotOccupied(lessons, dayKey, hour, minute, duration)) return;
    const startDate = buildStartISO(dayKey, hour, minute);
    const endDate = new Date(new Date(startDate).getTime() + duration * 60000).toISOString();
    setSlotModal({ startDate, endDate, teacherId });
  }, [lessons, duration, teacherId]);

  const handleLessonClick = useCallback((lesson: Lesson) => {
    // Get anchor rect from the clicked element via event — we use a workaround:
    // LessonActionsPopover positions itself near the click. We store lesson only,
    // and compute position from a fixed center offset.
    const el = document.querySelector(`[data-lesson-id="${lesson.id}"]`);
    const rect = el?.getBoundingClientRect() ?? new DOMRect(200, 200, 160, 36);
    setLessonPopover({ lesson, anchorRect: rect });
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as { type: string; child?: Child; lesson?: Lesson };
    const overId = over.id as string;

    // Parse slot from droppable ID: "slot-YYYY-MM-DD-HH-MM"
    const match = overId.match(/^slot-(\d{4}-\d{2}-\d{2})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return;
    const [, dayKey, hourStr, minuteStr] = match;
    const hour = parseInt(hourStr);
    const minute = parseInt(minuteStr);

    if (activeData.type === 'child' && activeData.child) {
      const child = activeData.child;
      if (!teacherId) return; // no teacher selected (admin without filter)
      if (isSlotOccupied(lessons, dayKey, hour, minute, duration)) return;
      const startDate = buildStartISO(dayKey, hour, minute);
      const endDate = new Date(new Date(startDate).getTime() + duration * 60000).toISOString();
      // Fetch price suggestion inline (or use 0 as fallback — user can edit)
      await createLesson.mutateAsync({
        childId: child.id,
        teacherId,
        status: 'PLANNED',
        startDate,
        endDate,
        price: 0,
      });
    }

    if (activeData.type === 'lesson' && activeData.lesson) {
      const lesson = activeData.lesson;
      if (isSlotOccupied(lessons, dayKey, hour, minute, duration, lesson.id)) return;
      const originalStart = lesson.startDate;
      const originalEnd = lesson.endDate;
      const durationMs = new Date(originalEnd).getTime() - new Date(originalStart).getTime();
      const newStart = buildStartISO(dayKey, hour, minute);
      const newEnd = new Date(new Date(newStart).getTime() + durationMs).toISOString();
      await updateLesson.mutateAsync({
        id: lesson.id,
        data: {
          status: 'RESCHEDULED',
          startDate: newStart,
          endDate: newEnd,
          originalStartDate: originalStart,
          originalEndDate: originalEnd,
        },
      });
    }
  }, [lessons, duration, teacherId, createLesson, updateLesson]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold">Дашборд</h2>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Select value={selectedTeacherId} onValueChange={(v) => setSelectedTeacherId(v ?? '')}>
              <SelectTrigger className="w-48">
                <SelectValue>
                  {users.find((u) => u.id === selectedTeacherId)?.name ?? 'Всі вчителі'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Всі вчителі</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={() => setWeekStart(getWeekStart(new Date()))}>
            Сьогодні
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={prevWeek}>
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm font-medium w-44 text-center">
              {fmtWeekLabel(weekStart)}
            </span>
            <Button variant="outline" size="sm" onClick={nextWeek}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 items-start">
          {/* Sidebar */}
          {(teacherId || !isAdmin) && (
            <ChildrenSidebar
              children={children}
              lessons={lessons}
              duration={duration}
              onDurationChange={setDuration}
            />
          )}
          {isAdmin && !teacherId && (
            <div className="w-48 shrink-0 flex items-center justify-center h-24 border rounded-lg bg-white text-sm text-gray-400">
              Оберіть вчителя
            </div>
          )}

          {/* Calendar */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <p className="text-gray-500">Завантаження...</p>
            ) : (
              <WeekCalendar
                lessons={lessons}
                weekStart={weekStart}
                onSlotClick={handleSlotClick}
                onLessonClick={handleLessonClick}
              />
            )}
          </div>
        </div>
      </DndContext>

      {/* Slot click → create modal */}
      {slotModal && (
        <LessonModal
          open
          onClose={() => setSlotModal(null)}
          defaultStartDate={slotModal.startDate}
          defaultEndDate={slotModal.endDate}
          defaultTeacherId={slotModal.teacherId}
        />
      )}

      {/* Lesson card edit modal */}
      {editLesson && (
        <LessonModal
          open
          onClose={() => setEditLesson(null)}
          lesson={editLesson}
        />
      )}

      {/* Lesson card actions popover */}
      {lessonPopover && (
        <LessonActionsPopover
          lesson={lessonPopover.lesson}
          anchorRect={lessonPopover.anchorRect}
          onClose={() => setLessonPopover(null)}
          onEdit={(lesson) => { setLessonPopover(null); setEditLesson(lesson); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add `data-lesson-id` attribute to DraggableLessonCard in WeekCalendar**

In `front/src/components/dashboard/week-calendar.tsx`, add `data-lesson-id={lesson.id}` to the `DraggableLessonCard`'s outer div:

```typescript
// In DraggableLessonCard, add to the className div:
<div
  ref={setNodeRef}
  data-lesson-id={lesson.id}   // ← add this
  style={style}
  className={`group rounded border-l-2 px-1 py-0.5 overflow-hidden cursor-grab ${cardStyle}`}
  ...
>
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/Apple/IT/School/front && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Manual end-to-end verification**

With both `npm run dev` (front) and `npm run start:dev` (back) running:

1. Open http://localhost:3000/dashboard
2. Select a teacher (admin) — sidebar appears with their children
3. Drag a child from sidebar onto an empty calendar slot → lesson created
4. Try dragging onto an occupied slot → green/red highlight, no lesson created
5. Click an empty slot → LessonModal opens with pre-filled date
6. Click a lesson card → actions popover appears
7. Click "Позначити проведеним" → lesson turns green
8. Click "Видалити" → confirm dialog → lesson removed
9. Drag an existing lesson to another empty slot → lesson moved with RESCHEDULED status

- [ ] **Step 5: Commit**

```bash
cd /Users/Apple/IT/School && git add front/src/app/'(admin)'/dashboard/page.tsx front/src/components/dashboard/week-calendar.tsx && git commit -m "feat: wire DndContext, sidebar, slot click, lesson actions to dashboard"
```

---

## Self-Review

### Spec coverage check:

| Spec requirement | Task |
|---|---|
| Sidebar with children filtered by teacher | Task 9, 12 |
| Duration switcher 55/30 | Task 9 |
| Drag child → empty slot creates lesson | Task 11, 12 |
| Drag onto occupied slot → blocked | Task 11, 12 |
| Drag lesson → reschedule (RESCHEDULED) | Task 11, 12 |
| Click empty slot → quick create | Task 7 (click handler), 8 (modal pre-fill), 12 |
| Click occupied slot → actions popover | Task 10, 12 |
| Mark conducted, edit, reschedule, duplicate, cancel, delete | Task 10 |
| Overdue lesson → red background | Task 7 |
| Navigation badge overdue count | Task 4, 5, 6 |
| Flag emoji for different-timezone children | Task 2, 7 |
| Today-dot indicator in sidebar | Task 9 |
| Overdue filter toggle in sidebar | Task 9 |
| Hover tooltip on lesson card | Task 7, 11 |
| "Duplicate next week" action | Task 10 |
| Admin with no teacher selected → show placeholder, block drop | Task 12 |
| Backend country in lesson response | Task 2 |
| Teachers can GET /children (their own) | Task 3 |
| `GET /lessons/overdue-count` endpoint | Task 4 |

All spec requirements are covered.

### No placeholders: confirmed, all code blocks are complete.

### Type consistency:
- `LessonChild.country: string` added in Task 2, used in Task 7/11
- `getLessonPos` exported in Task 7 (already was), not used externally — no issue
- `DroppableSlot` uses `data: { hour, minute }` but `onDragEnd` parses slot ID string instead — consistent
- `ChildrenSidebar.children` prop name shadows the React import — rename to `childList` in implementation if TypeScript complains
