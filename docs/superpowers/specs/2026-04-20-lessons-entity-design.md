# Lessons & LessonPrices Entity Design

**Date:** 2026-04-20
**Status:** Approved

---

## Overview

Two new entities: **Lesson** (a scheduled teaching session between a teacher and a student) and **LessonPrice** (a price table that determines the cost of a lesson for a given student-teacher pair over time).

---

## Data Model

### New Enums

```prisma
enum LessonStatus {
  PLANNED
  CONDUCTED
  CANCELLED
  RESCHEDULED
}
```

### Lesson

```prisma
model Lesson {
  id                String        @id @default(cuid())
  childId           String
  child             Child         @relation(fields: [childId], references: [id])
  teacherId         String
  teacher           User          @relation(fields: [teacherId], references: [id])
  status            LessonStatus  @default(PLANNED)
  startDate         DateTime
  endDate           DateTime
  price             Decimal
  originalStartDate DateTime?
  originalEndDate   DateTime?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
}
```

- `originalStartDate` / `originalEndDate` are filled when status changes to `RESCHEDULED`. They preserve the originally planned dates.
- `price` is required. At creation time, the backend auto-looks up the applicable `LessonPrice`; the frontend pre-fills the field but the user must confirm before saving.

### LessonPrice

```prisma
model LessonPrice {
  id            String   @id @default(cuid())
  childId       String
  child         Child    @relation(fields: [childId], references: [id])
  teacherId     String
  teacher       User     @relation(fields: [teacherId], references: [id])
  price         Decimal
  effectiveDate DateTime
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### Price Lookup Logic

When creating or editing a lesson, the backend queries:
```
SELECT * FROM LessonPrice
WHERE childId = :childId AND teacherId = :teacherId
  AND effectiveDate <= :lessonStartDate
ORDER BY effectiveDate DESC
LIMIT 1
```
If found, the price is returned to the frontend as a suggestion. If not found, the price field is empty and the user must enter it manually. Either way, `price` is required and cannot be saved as null.

### Schema Relations

- `Child` gains: `lessons Lesson[]`, `lessonPrices LessonPrice[]`
- `User` gains: `lessons Lesson[]`, `lessonPrices LessonPrice[]`
- `Lesson.child` relation: `onDelete: Cascade` — deleting a child removes their lessons
- `Lesson.teacher` relation: `onDelete: Restrict` — cannot delete a teacher who has lessons
- `LessonPrice.child` / `LessonPrice.teacher`: both `onDelete: Cascade`

---

## Backend

### Modules

Two new NestJS modules following the existing UsersModule / ChildrenModule pattern:
- `LessonsModule` — `LessonsController` + `LessonsService`
- `LessonPricesModule` — `LessonPricesController` + `LessonPricesService`

Both registered in `AppModule`.

### Lessons Endpoints (`/lessons`)

| Method | Path | Access | Notes |
|--------|------|--------|-------|
| GET | `/lessons?teacherId=&weekStart=` | ADMIN, TEACHER | ADMIN: filters by any teacherId; TEACHER: `teacherId` param ignored — always scoped to `currentUser.id`. `weekStart` is Monday date in `YYYY-MM-DD` format. |
| POST | `/lessons` | ADMIN, TEACHER | See permission rules below |
| PATCH | `/lessons/:id` | ADMIN, TEACHER | See permission rules below |
| DELETE | `/lessons/:id` | ADMIN, TEACHER | See permission rules below |

**Teacher permission rules:**
- `POST`: `child.teacherId` must equal `currentUser.id`, otherwise `403 Forbidden`
- `PATCH` / `DELETE`: `lesson.teacherId` must equal `currentUser.id`, otherwise `403 Forbidden`

**Price suggestion endpoint:**
- `GET /lessons/price-suggestion?childId=&teacherId=&startDate=` — returns the applicable `LessonPrice.price` or `null`. Called by the frontend when the user selects a child + teacher + date in the create modal.

### LessonPrices Endpoints (`/lesson-prices`)

| Method | Path | Access |
|--------|------|--------|
| GET | `/lesson-prices` | ADMIN only |
| POST | `/lesson-prices` | ADMIN only |
| PATCH | `/lesson-prices/:id` | ADMIN only |
| DELETE | `/lesson-prices/:id` | ADMIN only |

### DTOs

**CreateLessonDto:** `childId`, `teacherId`, `startDate` (ISO string), `endDate` (ISO string), `price` (number), `status?` (default PLANNED)

**UpdateLessonDto:** all fields optional + `originalStartDate?`, `originalEndDate?`

**CreateLessonPriceDto:** `childId`, `teacherId`, `price`, `effectiveDate` (ISO string)

**UpdateLessonPriceDto:** all fields optional

---

## Frontend

### Navigation (sidebar)

```
Користувачі | Діти | Уроки | Вартість заняття
```

Dashboard lives at `/dashboard` — the default redirect after login. Accessible from the logo/brand in the sidebar header.

### Pages & Components

#### `/lessons` — Lessons Table

Mirrors the existing Children page pattern.

**Table columns:** Учень, Вчитель, Статус (badge), Початок, Кінець, Ціна, Дії

**Status badges:**
| Status | Color |
|--------|-------|
| PLANNED | blue |
| CONDUCTED | green |
| CANCELLED | red |
| RESCHEDULED | orange |

When status is `RESCHEDULED`: show `originalStartDate`–`originalEndDate` as strikethrough text below the current date.

**Filter:** dropdown to filter by status.

**Components:**
- `LessonsTable` — table with sorting
- `LessonModal` — create/edit form (child select, teacher select, status, dates, price with auto-fill, original dates shown read-only when RESCHEDULED)
- `DeleteDialog` — confirm deletion

**LessonModal auto-fill behavior:** when child + teacher + startDate are all filled, calls `GET /lessons/price-suggestion` and pre-fills the price field. User can override. Price is required on submit.

#### `/lesson-prices` — Lesson Prices Table (ADMIN only)

**Table columns:** Учень, Вчитель, Ціна, Діє з (effectiveDate), Дії

Sorted by `effectiveDate DESC` by default.

**Components:**
- `LessonPricesTable`
- `LessonPriceModal` — create/edit form
- `DeleteDialog`

#### `/dashboard` — Weekly Calendar

**Layout:** 7-column CSS grid (Mon–Sun). Rows represent hours (08:00–22:00 range, 1 row per hour). Lessons are absolutely positioned within their time slot based on `startDate` / `endDate`.

**Lesson card:** child name, start–end time, colored left border by status.

**Navigation:** ← Previous week | Current week label (e.g. "14–20 квіт 2026") | Next week →. A "Сьогодні" button resets to current week.

**ADMIN view:** a `<Select>` above the calendar to choose which teacher's calendar to view. Defaults to the first teacher. TEACHER view shows only their own lessons — no selector.

**Data fetching:** `GET /lessons?teacherId=&weekStart=YYYY-MM-DD` returns all lessons for the selected teacher in the given week.

### React Query Hooks (`front/src/lib/lessons.ts`)

- `useLessons(filters?)` — GET /lessons
- `useCreateLesson()` — POST /lessons
- `useUpdateLesson()` — PATCH /lessons/:id
- `useDeleteLesson()` — DELETE /lessons/:id
- `usePriceSuggestion(childId, teacherId, startDate)` — GET /lessons/price-suggestion
- `useLessonPrices()` — GET /lesson-prices
- `useCreateLessonPrice()` — POST /lesson-prices
- `useUpdateLessonPrice()` — PATCH /lesson-prices/:id
- `useDeleteLessonPrice()` — DELETE /lesson-prices/:id

### Types (`front/src/types/lesson.ts`)

```typescript
type LessonStatus = 'PLANNED' | 'CONDUCTED' | 'CANCELLED' | 'RESCHEDULED';

interface Lesson {
  id: string;
  child: { id: string; name: string };
  teacher: { id: string; name: string };
  status: LessonStatus;
  startDate: string;
  endDate: string;
  price: string; // Decimal serialized as string
  originalStartDate: string | null;
  originalEndDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LessonPrice {
  id: string;
  child: { id: string; name: string };
  teacher: { id: string; name: string };
  price: string;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
}
```
