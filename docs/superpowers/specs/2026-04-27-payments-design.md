# Payments Entity — Design Spec
Date: 2026-04-27

## Overview

New "Payments" module for tracking whether lessons have been paid. Admins record payments from parents (paid to the school, not directly to teachers). The system explicitly links each payment to the specific lessons it covers and automatically recalculates those links whenever a payment or lesson changes.

This is an admin-only feature. Teachers are not affected and cannot see payment data.

---

## Data Model

### New Prisma models

```prisma
model Payment {
  id           String              @id @default(cuid())
  childId      String
  child        Child               @relation(fields: [childId], references: [id], onDelete: Restrict)
  teacherId    String
  teacher      User                @relation("PaymentTeacher", fields: [teacherId], references: [id], onDelete: Restrict)
  amount       Decimal
  date         DateTime
  notes        String?
  createdById  String
  createdBy    User                @relation("PaymentCreator", fields: [createdById], references: [id], onDelete: Restrict)
  lessons      PaymentLesson[]
  schoolTransactions SchoolTransaction[]
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt

  @@index([childId, teacherId])
  @@index([teacherId])
  @@index([date])
}

model PaymentLesson {
  id        String            @id @default(cuid())
  paymentId String
  payment   Payment           @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  lessonId  String
  lesson    Lesson            @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  amount    Decimal
  type      PaymentLessonType
  createdAt DateTime          @default(now())

  @@unique([paymentId, lessonId])
  @@index([lessonId])
}

model SchoolTransaction {
  id        String                    @id @default(cuid())
  amount    Decimal                   // positive = money IN, negative = money OUT
  reason    SchoolTransactionReason
  paymentId String?
  payment   Payment?                  @relation(fields: [paymentId], references: [id], onDelete: SetNull)
  adminId   String
  admin     User                      @relation("SchoolTxAdmin", fields: [adminId], references: [id], onDelete: Restrict)
  note      String?
  createdAt DateTime                  @default(now())
}

enum PaymentLessonType {
  DEBT     // covers a CONDUCTED lesson (closing debt)
  PREPAID  // covers a PLANNED lesson (advance payment)
}

enum SchoolTransactionReason {
  OVERPAYMENT_WRITEOFF  // excess remainder written off to school account
  UNDERPAYMENT_TOPUP    // school account used to cover shortfall
}
```

### Change to existing models

`Lesson` gets a new relation (no new columns):
```prisma
paymentLessons PaymentLesson[]
```

### School account balance

Computed on demand: `SUM(SchoolTransaction.amount)`. Never stored as a separate field — always accurate, never out of sync.

---

## Re-allocation Algorithm

**Triggers:** runs whenever any of the following change for a given `(childId, teacherId)` pair:
- Payment created, updated (amount or date), or deleted
- Lesson status changed (e.g., PLANNED → CONDUCTED, CONDUCTED → CANCELLED)
- Lesson deleted

**Steps:**

1. Load all `Payment` records for the pair, ordered by `date ASC` (oldest payment first).
2. Load all `Lesson` records for the pair where `status IN (CONDUCTED, PLANNED)`, ordered by `startDate ASC`.
3. Delete all existing `PaymentLesson` records for the payments from step 1.
4. Maintain a lesson queue with `remaining = lesson.price` for each lesson.
5. For each payment in order:
   - Walk the lesson queue, applying `min(paymentRemaining, lessonRemaining)` to each lesson until the payment amount is exhausted or no lessons remain.
   - Create a `PaymentLesson` record for each application: `type = DEBT` if lesson is CONDUCTED, `type = PREPAID` if PLANNED.
6. Any payment amount that exceeds all lessons (no lessons left in queue) is recorded as an unallocated remainder on the payment — used only for UI display, not stored separately.

**CANCELLED and RESCHEDULED lessons are excluded** from the queue. Their previously allocated amounts automatically flow to the next lessons in the queue.

**Decimal precision:** Use Prisma `Decimal` (exact arithmetic) throughout. Never convert to float during allocation to avoid rounding errors.

---

## Lesson Payment Status

Computed from `PaymentLesson` records (never a stored column):

| Lesson status | Condition | Display |
|---|---|---|
| CONDUCTED | `SUM(PaymentLesson.amount) >= lesson.price` | **Оплачено** (green) |
| CONDUCTED | `SUM(PaymentLesson.amount) < lesson.price` | **Не оплачено** (red) |
| PLANNED | Has any `PaymentLesson` with `type = PREPAID` | **Передоплачено** (blue) |
| PLANNED | No PaymentLesson | *(empty)* |
| CANCELLED / RESCHEDULED | — | *(empty)* |

---

## Backend — New Endpoints

All endpoints live in a new `PaymentsModule`. Admin-only (returns 403 for TEACHER role).

| Method | Path | Description |
|---|---|---|
| GET | `/payments` | List all payments. Supports `?teacherId=`, `?from=`, `?to=` filters. |
| POST | `/payments` | Create payment + run re-allocation. |
| PATCH | `/payments/:id` | Update payment + run re-allocation. |
| DELETE | `/payments/:id` | Delete payment + run re-allocation. |
| GET | `/payments/preview` | Preview allocation for a given `childId`, `teacherId`, `amount` — used by the popup's live indicator. No DB write. |
| GET | `/payments/school-balance` | Returns current school account balance + recent SchoolTransaction list. |
| POST | `/payments/:id/writeoff` | Write off payment remainder to school account (creates SchoolTransaction). |
| POST | `/payments/:id/topup` | Draw from school account to cover payment shortfall (creates SchoolTransaction). |

The lessons endpoint (`GET /lessons`) gains a computed `paymentStatus` field in the response when the requesting user is ADMIN.

---

## Preview Endpoint Response

Used by the popup's live indicator. Takes `childId`, `teacherId`, `amount` as query params (and optionally `excludePaymentId` for edit mode). Returns:

```typescript
{
  debtLessons: number,       // conducted lessons closed by this payment
  prepaidLessons: number,    // planned lessons prepaid
  remainder: number,         // amount left after all lessons (positive = overpayment, negative = not enough)
  nextLessonPrice: number | null,  // price of next uncovered lesson (for school account buttons)
  schoolBalance: number,     // current school account balance
}
```

---

## Frontend — New Page `/payments`

### Route
`front/src/app/(admin)/payments/page.tsx`

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Рахунок школи: ₴ 1,250.00   [+][-] transaction history      │
├──────────────────────────────────────────────────────────────┤
│  [Всі вчителі ▾]  [Від: ____]  [До: ____]  [+ Додати оплату]│
├──────────────────────────────────────────────────────────────┤
│  Дата ↕ | Дитина ↕ | Вчитель ↕ | Сума ↕ | Закрито ↕ | Передоплата ↕ | Дії │
│  ...                                                         │
└──────────────────────────────────────────────────────────────┘
```

### Payment Popup (create + edit)

Fields: Teacher select → Child select (filtered by teacher) → Amount → Date → Notes (optional).

Live indicator updates on amount change (calls `/payments/preview`):

```
[🟥][🟥][🟥][🟩][🟩]
Закрито боргу:  3 заняття (900 грн)
Передоплачено:  2 заняття (600 грн)
Залишок:        ₴ 0  ← exact match → auto-close on save
```

Overpayment (remainder > 0, not enough for next lesson):
```
Залишок: ₴ 100 (недостатньо для наступного заняття - 300 грн)
[💰 Списати ₴ 100 на рахунок школи]
```

Underpayment (remainder < 0, short of next lesson):
```
Не вистачає: ₴ 50 (баланс школи: ₴ 1,250)
[🏦 Взяти ₴ 50 з рахунку школи]   ← disabled if schoolBalance < shortfall
```

Popup close behavior:
- Exact match → auto-close after save
- Overpayment / underpayment → user must choose action (writeoff/topup) or manually close

### School Account Widget

Small card above the table. Shows:
- Current balance (green if ≥ 0, red if < 0)
- Expandable/collapsible transaction log: date, admin name, amount, reason

### Navigation

Add `{ href: '/payments', label: 'Оплати' }` to `navItems` in `layout.tsx`, after "Уроки".

### New Component Files

```
front/src/app/(admin)/payments/
  page.tsx
  _components/
    SchoolBalanceWidget.tsx
    PaymentsTable.tsx
    PaymentModal.tsx
    AllocationPreview.tsx    ← the red/green cube indicator
front/src/types/payment.ts
front/src/lib/payments.ts   ← TanStack Query hooks
```

---

## Lessons Table Change

`front/src/components/lessons/lessons-table.tsx`:
- New column "Оплата" rendered only when `currentUser.role === 'ADMIN'`
- Sortable
- Data comes from `paymentStatus` field on each lesson (returned by the backend)
- Badge variants: green "Оплачено", red "Не оплачено", blue "Передоплачено"

---

## Out of Scope

- Teacher visibility of payment data
- Per-teacher school account splits (planned for future)
- Payment method tracking (cash vs transfer)
- Invoice generation
- Bulk payment import
