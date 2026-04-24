# Dashboard Widgets — Design Spec
Date: 2026-04-24

## Overview

Replace the current `/dashboard` page with a proper widget-based overview dashboard. The existing WeekCalendar view moves to a new `/calendar` tab. The dashboard shows key metrics, financial summaries, lesson dynamics, and student stats — all controlled by a single global period switcher.

---

## Navigation Change

- Current "Dashboard" tab → renamed to **"Календар"**, keeps the existing WeekCalendar component
- New `/dashboard` page → the widget dashboard described in this spec

---

## Layout

Responsive card grid. One global period switcher in the page header controls the financial cards and lesson chart simultaneously.

```
Dashboard                                    [Тиждень | Місяць | Рік]

┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│  Наступний урок │   Зароблено     │   Очікується    │  Активні учні   │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
┌──────────────────────────────────┬──────────────────────────────────────┐
│  Динаміка уроків (bar chart)     │  Учні по країнах                    │
└──────────────────────────────────┴──────────────────────────────────────┘

── тільки для адміна ──────────────────────────────────────────────────────
┌──────────────────────────────────────────────────────────────────────────┐
│  Таблиця вчителів                                                        │
└──────────────────────────────────────────────────────────────────────────┘
```

Default period: **Місяць** (current calendar month).

---

## Widgets

### 1. Наступний урок
- Avatar + child name
- Lesson start time
- Live countdown timer (updates every second via `setInterval`)
- States:
  - Upcoming: "за 1г 23хв"
  - In progress: "Зараз · залишилось 20хв"
  - No more today: "Наступний урок завтра о 10:00" (shows next future lesson date/time)
  - None scheduled: "Немає запланованих уроків"
- Not affected by the period switcher

### 2. Зароблено
- Sum of all `CONDUCTED` lessons (`price`) within the selected period
- Secondary line: `▲ +12% vs попередній період` (comparison with the same duration before)
- Teacher sees own lessons only; admin sees all teachers combined

### 3. Очікується
- Sum of all `PLANNED` lessons (`price`) within the selected period (future dates only)
- Same comparison line as "Зароблено"
- Teacher sees own; admin sees all

### 4. Активні учні
- Count of children where `teacherId` is set AND `graduationDate` is null or in the future
- Sub-line: `+2 нових цього місяця` (children with `hireDate` within the current calendar month, always — not affected by period switcher)
- Teacher sees own children; admin sees all

### 5. Динаміка уроків (Bar Chart)
- Library: **Recharts** (`BarChart` + `Tooltip`)
- X-axis granularity based on period:
  - Тиждень → days (Mon–Sun)
  - Місяць → weeks (Week 1 … Week 4/5)
  - Рік → months (Jan–Dec)
- Stacked bars, one segment per status:
  - Green — `CONDUCTED`
  - Red — `CANCELLED`
  - Blue — `PLANNED`
  - Orange — `RESCHEDULED`
- Hover tooltip shows count per status for that bar
- Teacher sees own; admin sees all

### 6. Учні по країнах
- List of countries with flag emoji + country name + child count
- Sorted descending by count
- Teacher sees own children; admin sees all
- Not affected by the period switcher

### 7. Таблиця вчителів (admin only)
- Columns: Ім'я | Уроків (period) | Зароблено | Очікується | Учнів
- Sorted by lessons count descending
- Responds to the period switcher (lessons/earnings columns)

---

## API — New Backend Endpoints

All endpoints live in a new `DashboardModule`. Period is passed as `?period=week|month|year`.  
Admin can optionally pass `?teacherId=...` to filter by teacher (used for per-teacher rows in the teacher table).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard/summary` | Зароблено, очікується, comparison deltas. Scoped to requesting user or all (admin). |
| GET | `/dashboard/chart` | Array of `{ date, conducted, cancelled, planned, rescheduled }` grouped by period granularity. |
| GET | `/dashboard/next-lesson` | Single next `PLANNED` lesson for the requesting user (teacher). For admin — the globally next lesson across all teachers. |
| GET | `/dashboard/children-stats` | `{ active, newThisMonth, byCountry: [{ country, count }] }` |
| GET | `/dashboard/teachers` | Array of teacher rows. Admin only — returns 403 for teachers. |

---

## Frontend Structure

```
src/app/(admin)/dashboard/
  page.tsx                  ← new widget dashboard
  _components/
    PeriodSwitcher.tsx
    NextLessonCard.tsx
    SummaryCard.tsx         ← reused for Зароблено + Очікується
    LessonChart.tsx
    ChildrenByCountry.tsx
    ActiveChildrenCard.tsx
    TeachersTable.tsx       ← rendered only for admin role
```

State: period stored in React state (or URL param `?period=month`) at `page.tsx` level, passed as prop to all period-aware components.

---

## Access Control

- Teachers: see only their own data (backend filters by `req.user.id`)
- Admins: see aggregate data across all teachers
- `TeachersTable` endpoint returns HTTP 403 if role is not ADMIN

---

## Out of Scope

- Real-time updates (no WebSocket polling)
- Export / download reports
- Per-child breakdown on the dashboard
