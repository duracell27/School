# Mobile Responsive Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all admin pages (except Calendar) usable on mobile screens (375px+) using Tailwind breakpoints.

**Architecture:** One new component (`MobileHeader`), one modified base component (`DialogContent` → bottom-sheet on mobile), and per-table mobile card lists added alongside existing desktop tables. Desktop layout is 100% unchanged.

**Tech Stack:** Next.js 16, Tailwind CSS v4, lucide-react, @base-ui/react/dialog, tailwindcss-animate

---

## File Map

**New:**
- `front/src/components/ui/mobile-header.tsx`

**Modified:**
- `front/src/app/(admin)/layout.tsx`
- `front/src/components/ui/dialog.tsx`
- `front/src/components/lessons/lesson-modal.tsx`
- `front/src/components/lessons/lessons-table.tsx`
- `front/src/components/children/children-table.tsx`
- `front/src/components/users/users-table.tsx`
- `front/src/components/lesson-prices/lesson-prices-table.tsx`
- `front/src/app/(admin)/payments/_components/PaymentsTable.tsx`
- `front/src/app/(admin)/payments/page.tsx`
- `front/src/app/(admin)/dashboard/page.tsx`

---

### Task 1: MobileHeader component

**Files:**
- Create: `front/src/components/ui/mobile-header.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useOverdueCount } from '@/lib/lessons';
import { useSchoolAccount } from '@/lib/payments';
import { formatCurrency } from '@/lib/format';
import { apiFetch } from '@/lib/api';

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

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: overdueCount = 0 } = useOverdueCount();
  const { data: schoolAccount } = useSchoolAccount();

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <header className="sticky top-0 z-40 bg-white border-b px-4 h-12 flex items-center justify-between">
      <div className="leading-tight">
        <p className="font-semibold text-sm">Teacher Platform</p>
        {schoolAccount != null && (
          <p className="text-[10px] text-gray-400 leading-none">
            Баланс: <span className="font-semibold text-black">{formatCurrency(schoolAccount.balance)}</span>
          </p>
        )}
      </div>
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Меню"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border-b shadow-lg z-50">
          <nav className="px-3 py-2 space-y-0.5">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                  {item.showBadge && overdueCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {overdueCount > 99 ? '99+' : overdueCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="px-3 pb-3 pt-1 border-t">
            <button
              onClick={async () => {
                await apiFetch('/auth/logout', { method: 'POST' });
                router.replace('/login');
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              Вийти
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd /Users/Apple/IT/School/front && npx tsc --noEmit 2>&1 | head -20`
Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add front/src/components/ui/mobile-header.tsx
git commit -m "feat(mobile): MobileHeader with hamburger dropdown nav"
```

---

### Task 2: AdminLayout — responsive shell

**Files:**
- Modify: `front/src/app/(admin)/layout.tsx`

- [ ] **Step 1: Import MobileHeader and update the return**

Add import at top:
```tsx
import { MobileHeader } from '@/components/ui/mobile-header';
```

Replace the entire `return (...)` in `AdminLayout` with:
```tsx
return (
  <div className="min-h-screen flex flex-col md:flex-row">
    <MobileHeader />
    <aside className="w-56 shrink-0 bg-white border-r flex-col hidden md:flex">
      <div className="px-5 py-5 border-b">
        <span className="font-semibold text-sm">Teacher Platform</span>
        <SidebarSchoolBalance />
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
    <main className="flex-1 p-3 md:p-6 bg-gray-50">{children}</main>
  </div>
);
```

Note: `MobileHeader` is always rendered but styled `sticky top-0` — the `md:hidden` wrapper goes on `MobileHeader` internally if needed, but since the sidebar is `hidden md:flex` and MobileHeader has no `md:hidden`, add it. Update MobileHeader's `<header>` to `className="md:hidden sticky top-0 ..."` — open `mobile-header.tsx` and add `md:hidden` to the header element's className.

- [ ] **Step 2: Add md:hidden to MobileHeader's header element**

In `front/src/components/ui/mobile-header.tsx`, change:
```tsx
<header className="sticky top-0 z-40 bg-white border-b px-4 h-12 flex items-center justify-between">
```
to:
```tsx
<header className="md:hidden sticky top-0 z-40 bg-white border-b px-4 h-12 flex items-center justify-between">
```

- [ ] **Step 3: Test in browser**

Open DevTools → set viewport to 375px.
Expected:
- Sticky header at top, hamburger icon on right
- No sidebar
- Tapping hamburger shows dropdown with all nav items
- Tapping a nav item navigates and closes the dropdown
- At 768px+: sidebar visible, no mobile header, `p-6` on main

- [ ] **Step 4: Commit**

```bash
git add "front/src/app/(admin)/layout.tsx" front/src/components/ui/mobile-header.tsx
git commit -m "feat(mobile): responsive layout — sidebar hidden on mobile, MobileHeader shown"
```

---

### Task 3: DialogContent — bottom sheet on mobile

**Files:**
- Modify: `front/src/components/ui/dialog.tsx`

- [ ] **Step 1: Replace DialogContent's Popup className**

Find the `DialogPrimitive.Popup` element inside `DialogContent` and replace its `className={cn(...)}` with:

```tsx
className={cn(
  // base
  "fixed z-50 grid w-full bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none duration-200",
  // mobile: bottom sheet
  "bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto rounded-t-2xl",
  "data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom",
  // desktop: centred modal
  "sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-sm sm:rounded-xl sm:max-h-none sm:overflow-visible",
  "sm:data-open:zoom-in-95 sm:data-closed:zoom-out-95",
  className
)}
```

- [ ] **Step 2: Test at 375px**

Open any modal (e.g. "+ Додати урок" on /lessons).
Expected:
- Sheet slides up from bottom of screen
- Max height 90vh, scrollable if tall
- Rounded top corners
- At 640px+: centred modal, same as before

- [ ] **Step 3: Commit**

```bash
git add front/src/components/ui/dialog.tsx
git commit -m "feat(mobile): DialogContent renders as bottom sheet on mobile"
```

---

### Task 4: LessonModal — fix form grid

**Files:**
- Modify: `front/src/components/lessons/lesson-modal.tsx`

- [ ] **Step 1: Fix the child/teacher grid**

Find:
```tsx
<div className="grid grid-cols-2 gap-3">
```
Replace with:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
```

- [ ] **Step 2: Test at 375px**

Open "+ Додати урок".
Expected: "Учень" and "Вчитель" fields stack vertically on mobile, side-by-side on desktop.

- [ ] **Step 3: Commit**

```bash
git add front/src/components/lessons/lesson-modal.tsx
git commit -m "feat(mobile): lesson modal form stacks vertically on mobile"
```

---

### Task 5: LessonsTable — mobile cards

**Files:**
- Modify: `front/src/components/lessons/lessons-table.tsx`

- [ ] **Step 1: Wrap the existing Table in a desktop-only div**

Find the `return (` at the bottom of `LessonsTable` (the function, not `StatusSelect`). The return currently starts with `<Table>`. Change it to:

```tsx
return (
  <>
    {/* Mobile cards */}
    <div className="md:hidden divide-y">
      {lessons.map((lesson) => {
        const startStr = new Date(lesson.startDate).toLocaleString('uk-UA', {
          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        });
        const overdue = lesson.status === 'PLANNED' && new Date(lesson.endDate) < new Date();
        const badgeColor = overdue ? 'bg-red-100 text-red-700' : STATUS_COLORS[lesson.status];
        const badgeLabel = overdue ? 'Не оброблено' : STATUS_LABELS[lesson.status];
        return (
          <div key={lesson.id} className="px-4 py-3 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <ChildAvatar name={lesson.child.name} avatar={lesson.child.avatar} size={32} />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight truncate">{lesson.child.name}</p>
                <p className="text-xs text-gray-500">{startStr}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badgeColor}`}>
                    {badgeLabel}
                  </span>
                  <span className="text-xs text-gray-600">{Number(lesson.price).toLocaleString('uk-UA')} грн</span>
                  {lesson.paymentStatus && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${PAYMENT_STATUS_COLORS[lesson.paymentStatus]}`}>
                      {PAYMENT_STATUS_LABELS[lesson.paymentStatus]}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onEdit(lesson)}>
                Ред.
              </Button>
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-500 border-red-200" onClick={() => onDelete(lesson)}>
                Вид.
              </Button>
            </div>
          </div>
        );
      })}
      {lessons.length === 0 && (
        <p className="px-4 py-6 text-sm text-gray-400 text-center">Уроків не знайдено</p>
      )}
    </div>

    {/* Desktop table */}
    <div className="hidden md:block">
      <Table>
        {/* paste the entire existing Table JSX here unchanged */}
      </Table>
    </div>
  </>
);
```

- [ ] **Step 2: Test at 375px**

Open /lessons.
Expected: one card per lesson showing child avatar, name, date/time, status badge, price. Edit and Delete buttons on the right.

- [ ] **Step 3: Commit**

```bash
git add front/src/components/lessons/lessons-table.tsx
git commit -m "feat(mobile): lessons table shows cards on mobile"
```

---

### Task 6: ChildrenTable — mobile cards

**Files:**
- Modify: `front/src/components/children/children-table.tsx`

- [ ] **Step 1: Update the return in `ChildrenTable`**

The current `return (` starts with `<Table>`. Replace with:

```tsx
return (
  <>
    {/* Mobile cards */}
    <div className="md:hidden divide-y">
      {sorted.map((child) => {
        const flag = getCountry(child.country)?.flag ?? child.country;
        const teacherNames = [...new Set(child.subjects.map(s => s.teacher.name))];
        return (
          <div key={child.id} className="px-4 py-3 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <ChildAvatar name={child.name} avatar={child.avatar} size={36} />
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium leading-tight">{child.name}</span>
                  <span>{flag}</span>
                </div>
                {child.subjects.length > 0 && (
                  <p className="text-xs text-gray-500 leading-tight">
                    {child.subjects.map(s => `${subjectEmoji(s.subject)} ${subjectLabel(s.subject)}`).join(', ')}
                  </p>
                )}
                {teacherNames.length > 0 && (
                  <p className="text-xs text-gray-400 leading-tight">{teacherNames.join(', ')}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onManageSubjects(child)}>
                <BookOpen size={12} />
              </Button>
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onEdit(child)}>
                Ред.
              </Button>
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-500 border-red-200" onClick={() => onDelete(child)}>
                Вид.
              </Button>
            </div>
          </div>
        );
      })}
      {sorted.length === 0 && (
        <p className="px-4 py-6 text-sm text-gray-400 text-center">Дітей не знайдено</p>
      )}
    </div>

    {/* Desktop table */}
    <div className="hidden md:block">
      <Table>
        {/* paste entire existing Table JSX here unchanged */}
      </Table>
    </div>
  </>
);
```

- [ ] **Step 2: Test at 375px**

Open /children.
Expected: cards with child avatar, name + flag, subjects, teacher name. 3 action buttons.

- [ ] **Step 3: Commit**

```bash
git add front/src/components/children/children-table.tsx
git commit -m "feat(mobile): children table shows cards on mobile"
```

---

### Task 7: UsersTable — mobile cards

**Files:**
- Modify: `front/src/components/users/users-table.tsx`

- [ ] **Step 1: Add ROLE_LABELS constant and update return**

Add near the top of the file (after imports):
```tsx
const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Адмін',
  ADMIN_TEACHER: 'Адмін-вчитель',
  TEACHER: 'Вчитель',
};
```

Replace the `return (` in `UsersTable` (currently starts with `<Table>`):

```tsx
return (
  <>
    {/* Mobile cards */}
    <div className="md:hidden divide-y">
      {users.map((user) => (
        <div key={user.id} className="px-4 py-3 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <UserAvatar name={user.name} avatar={user.avatar} size={36} />
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
              <p className="text-xs text-gray-400">{ROLE_LABELS[user.role] ?? user.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onEdit(user)}>
              Ред.
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-500 border-red-200" onClick={() => onDelete(user)}>
              Вид.
            </Button>
          </div>
        </div>
      ))}
      {users.length === 0 && (
        <p className="px-4 py-6 text-sm text-gray-400 text-center">Користувачів не знайдено</p>
      )}
    </div>

    {/* Desktop table */}
    <div className="hidden md:block">
      <Table>
        {/* paste entire existing Table JSX here unchanged */}
      </Table>
    </div>
  </>
);
```

- [ ] **Step 2: Test at 375px**

Open /users.
Expected: cards with avatar, name, email, role. Edit/Delete buttons.

- [ ] **Step 3: Commit**

```bash
git add front/src/components/users/users-table.tsx
git commit -m "feat(mobile): users table shows cards on mobile"
```

---

### Task 8: LessonPricesTable — mobile cards

**Files:**
- Modify: `front/src/components/lesson-prices/lesson-prices-table.tsx`

- [ ] **Step 1: Update return in `LessonPricesTable`**

The current `return (` starts with `<Table>`. Replace with:

```tsx
return (
  <>
    {/* Mobile cards */}
    <div className="md:hidden divide-y">
      {prices.map((p) => {
        const flag = getCountry(p.child.country)?.flag ?? p.child.country;
        const effectiveFrom = p.effectiveFrom
          ? new Date(p.effectiveFrom).toLocaleDateString('uk-UA')
          : '—';
        return (
          <div key={p.id} className="px-4 py-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <ChildAvatar name={p.child.name} avatar={p.child.avatar} size={24} />
                <span className="text-sm font-medium">{p.child.name}</span>
                <span>{flag}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {p.teacher.name}
                {p.subject && ` · ${subjectEmoji(p.subject)} ${subjectLabel(p.subject)}`}
              </p>
              <p className="text-sm font-semibold mt-0.5">{Number(p.price).toLocaleString('uk-UA')} грн</p>
              <p className="text-xs text-gray-400">Діє з: {effectiveFrom}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onEdit(p)}>
                Ред.
              </Button>
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-500 border-red-200" onClick={() => onDelete(p)}>
                Вид.
              </Button>
            </div>
          </div>
        );
      })}
      {prices.length === 0 && (
        <p className="px-4 py-6 text-sm text-gray-400 text-center">Цін не знайдено</p>
      )}
    </div>

    {/* Desktop table */}
    <div className="hidden md:block">
      <Table>
        {/* paste entire existing Table JSX here unchanged */}
      </Table>
    </div>
  </>
);
```

- [ ] **Step 2: Test at 375px**

Open /lesson-prices.
Expected: cards showing child, teacher, subject, price, effective-from date.

- [ ] **Step 3: Commit**

```bash
git add front/src/components/lesson-prices/lesson-prices-table.tsx
git commit -m "feat(mobile): lesson prices table shows cards on mobile"
```

---

### Task 9: PaymentsTable + page — mobile cards

**Files:**
- Modify: `front/src/app/(admin)/payments/_components/PaymentsTable.tsx`
- Modify: `front/src/app/(admin)/payments/page.tsx`

- [ ] **Step 1: Add TYPE_LABELS and mobile cards to PaymentsTable**

Add near top of `PaymentsTable.tsx` (after imports):
```tsx
const TYPE_LABELS: Record<string, string> = {
  CASH: 'Готівка',
  TRANSFER: 'Переказ',
  PREPAID: 'Передоплата',
};
```

Inside `PaymentsTable`, the current `return (` starts with `<>` containing a table and an AlertDialog. Locate the `<Table>` element and wrap it:

```tsx
{/* Mobile cards */}
<div className="md:hidden divide-y">
  {sorted.map((payment) => {
    const flag = getCountry(payment.child.country)?.flag ?? payment.child.country;
    const dateStr = new Date(payment.createdAt).toLocaleDateString('uk-UA', {
      day: '2-digit', month: '2-digit', year: '2-digit',
    });
    return (
      <div key={payment.id} className="px-4 py-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <ChildAvatar name={payment.child.name} avatar={payment.child.avatar} size={24} />
            <span className="text-sm font-medium">{payment.child.name}</span>
            <span>{flag}</span>
          </div>
          <p className="text-xs text-gray-500">{payment.teacher.name} · {dateStr}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm font-semibold">{formatCurrency(Number(payment.amount))}</span>
            <span className="text-xs text-gray-400">{TYPE_LABELS[payment.type] ?? payment.type}</span>
          </div>
        </div>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs shrink-0" onClick={() => onEdit(payment)}>
          Ред.
        </Button>
      </div>
    );
  })}
  {sorted.length === 0 && (
    <p className="px-4 py-6 text-sm text-gray-400 text-center">Оплат не знайдено</p>
  )}
</div>

{/* Desktop table */}
<div className="hidden md:block">
  <Table>
    {/* existing Table JSX unchanged */}
  </Table>
</div>
```

- [ ] **Step 2: Fix filter Select width in payments page**

In `front/src/app/(admin)/payments/page.tsx`, find the teacher filter Select trigger:
```tsx
<SelectTrigger className="w-48">
```
Change to:
```tsx
<SelectTrigger className="w-full sm:w-48">
```

Also find the date inputs (`className="w-36"`) and change to `className="w-full sm:w-36"`.

- [ ] **Step 3: Test at 375px**

Open /payments.
Expected: payment cards with child, teacher, date, amount, type. Filter dropdowns full-width on mobile.

- [ ] **Step 4: Commit**

```bash
git add "front/src/app/(admin)/payments/_components/PaymentsTable.tsx" "front/src/app/(admin)/payments/page.tsx"
git commit -m "feat(mobile): payments table cards + filter layout on mobile"
```

---

### Task 10: Dashboard — overflow-x-auto

**Files:**
- Modify: `front/src/app/(admin)/dashboard/page.tsx`

- [ ] **Step 1: Wrap chart and teachers table**

Find:
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <LessonChart period={period} date={dateParam} />
  <ChildrenByCountry />
</div>

{isAdmin && <TeachersTable period={period} date={dateParam} />}
```

Replace with:
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <div className="md:col-span-2 overflow-x-auto">
    <LessonChart period={period} date={dateParam} />
  </div>
  <ChildrenByCountry />
</div>

{isAdmin && (
  <div className="overflow-x-auto">
    <TeachersTable period={period} date={dateParam} />
  </div>
)}
```

- [ ] **Step 2: Test at 375px**

Open /dashboard.
Expected: 2-column metric grid, chart scrollable if wider than screen, teachers table scrollable horizontally.

- [ ] **Step 3: Commit**

```bash
git add "front/src/app/(admin)/dashboard/page.tsx"
git commit -m "feat(mobile): dashboard chart and teachers table overflow-x-auto"
```
