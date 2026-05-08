# Mobile Responsive Design

**Date:** 2026-05-08
**Scope:** All admin pages except Calendar

---

## Approach

Pure Tailwind breakpoints. Three new shared components cover the structural changes; all other work is targeted class additions in existing files. Desktop layout is unchanged.

---

## New Shared Components

### `components/ui/mobile-header.tsx`
Top header shown only on mobile (`md:hidden`). Contains:
- Left: "Teacher Platform" title
- Right: school balance + hamburger button (`Menu` icon from lucide)
- Clicking hamburger opens a dropdown with all nav items and a logout button at the bottom
- Dropdown closes on route change

### `components/ui/bottom-sheet.tsx`
Wrapper that renders as a bottom sheet on mobile (fixed, bottom-0, rounded-t-xl, slide-up animation) and as a standard Dialog on desktop. Drop-in replacement for `DialogContent` — callers need no other changes.

### `components/ui/mobile-card.tsx`
Renders a table row as a card on mobile. Props: `fields: { label: string; value: React.ReactNode }[]` and optional `actions` slot.

---

## Layout (`app/(admin)/layout.tsx`)

- Sidebar: `hidden md:flex` (hidden on mobile)
- Add `MobileHeader` above `<main>` with `md:hidden`
- `<main>`: `p-3 md:p-6`

---

## Page Changes

### Dashboard
- `grid-cols-2` stays on all screen sizes
- Chart and teachers table: wrap in `overflow-x-auto`

### Lessons, Children, Users, Lesson Prices, Commissions
Same pattern for each:
- Table: `hidden md:block`
- Mobile card list: `md:hidden`, one `MobileCard` per row
- Card fields per page:
  - **Lessons:** date+time, child name, status, price
  - **Children:** name, country, subjects, teacher
  - **Users:** name, role, email
  - **Lesson Prices:** child, teacher, subject, price
  - **Commissions:** teacher, commission %, school revenue, teacher earned
- Filters/search: `flex-wrap gap-2` so they wrap on small screens

### Payments
- Balance widgets: `grid-cols-1 sm:grid-cols-3`
- Payments table: same card pattern as above (date, child, amount, type, status)

### Modals (LessonModal, LessonNoteModal)
- Replace `DialogContent` with `BottomSheet`
- Two-column form grids: `grid-cols-1 sm:grid-cols-2`

### Calendar
- No changes. Desktop-only.

---

## Out of Scope
- Calendar page
- Any backend changes
- Touch gestures beyond standard scrolling
