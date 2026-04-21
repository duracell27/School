# Dashboard Lessons UX — Design Spec
Date: 2026-04-22

## Overview

Enhance the dashboard calendar with interactive lesson management: drag-and-drop child scheduling, slot popups with quick actions, overdue lesson indicators, and a children sidebar.

## Tech Stack Additions

- `@dnd-kit/core` + `@dnd-kit/utilities` — drag-and-drop (sidebar→slot, lesson→reschedule)
- shadcn `Popover` — slot action popups (already in project)

---

## Layout

The dashboard page is split into two panels:

```
┌─────────────────────────────────────────────────────────┐
│  [Teacher filter]  [Week nav]  [Today btn]              │
├──────────────┬──────────────────────────────────────────┤
│  SIDEBAR     │  WEEK CALENDAR                           │
│  ~200px      │                                          │
│  [55] [30]   │  Mon  Tue  Wed  Thu  Fri  Sat  Sun       │
│  ──────────  │  06:00 ─────────────────────────────     │
│  👦 Артем  • │  ...   [lesson card]  ...                │
│  👧 Соня     │  ...                                     │
│  👦 Макс     │  22:00 ─────────────────────────────     │
└──────────────┴──────────────────────────────────────────┘
```

- Sidebar: fixed ~200px width, scrolls independently
- Calendar: takes remaining width, existing WeekCalendar component
- Teacher filter at top controls both sidebar children list and calendar lessons

---

## Sidebar

### Duration Switcher
- Toggle above children list: `55хв` | `30хв`
- Default: 55хв
- Controls lesson duration when drag-dropping or using quick-create popup

### Sidebar Controls Order (top to bottom)
1. Duration switcher: `55хв` | `30хв`
2. Filter toggle: "лише з необробленими" (show only children with overdue lessons)
3. Children list

### Children List
- Each item: avatar + name, draggable
- Filtered by selected teacher (same filter as calendar)
- Indicator dot (•) next to child name if they have a lesson today
- If admin has no teacher selected: sidebar shows empty state "Оберіть вчителя"

---

## Calendar Slot Interactions

### Drag Child from Sidebar → Empty Slot
- Hover over empty slot: green highlight (drop available)
- Hover over occupied slot: red highlight, drop blocked
- On drop: lesson created immediately with:
  - child from draggable
  - teacher from current filter (if admin has no teacher selected — drop is blocked, same as occupied slot)
  - startTime = slot time
  - duration = value from switcher (55 or 30 min)
  - status = PLANNED

### Drag Lesson Card → Another Empty Slot (Reschedule)
- Existing lesson cards are draggable
- Drop on empty slot: lesson updated with new startTime/endTime
- Status changes to `RESCHEDULED`, original date saved in existing `originalDate` field

### Click Empty Slot → Quick Create Popover
Fields:
- Child select (avatar + name, searchable)
- Time: pre-filled from slot, editable
- Duration: pre-filled from sidebar switcher
- "Створити" button

### Click Occupied Slot (Lesson Card) → Actions Popover
Quick action buttons:
- ✅ Позначити проведеним → sets status = CONDUCTED
- ✏️ Редагувати → opens full LessonModal
- 📅 Перенести → opens LessonModal focused on date/time field
- 📋 Повторити наступного тижня → creates copy of lesson with startTime +7 days
- ❌ Скасувати → sets status = CANCELLED
- 🗑️ Видалити → opens DeleteDialog confirmation

---

## Lesson Card

Displayed in the calendar grid. Shows:
- Child name + avatar
- Start time (teacher local time)
- If child is in a different timezone: child's local time + country flag emoji (derived from child's timezone field)
  - Example: `🇵🇱 14:00`
- Status color coding (existing behavior)
- **Overdue**: red background if `status === PLANNED && endTime < now`
- **Tooltip on hover**: child name, time range, price, status (full info without opening popup)

---

## Overdue Lesson Indicator

**In calendar:** lesson card background turns red when `status === PLANNED && lesson.endTime < Date.now()`.

**In navigation:** red badge counter next to "Уроки" nav item.
- Count = number of PLANNED lessons with endTime in the past
- For teachers: only their lessons
- For admins: all teachers' lessons
- Requires dedicated backend endpoint: `GET /lessons/overdue-count` — returns a single number
- Fetched with a separate `useOverdueLessonsCount` hook, polled every 5 minutes

---

## Additional Features

### Quick Duplicate (Repeat Next Week)
- In occupied slot popover: "Повторити наступного тижня"
- Creates new lesson with same child, teacher, time, duration, price
- startTime = original startTime + 7 days
- status = PLANNED

### Today Indicator in Sidebar
- Small dot (•) next to child's name if they have at least one lesson today
- Derived from the current week's lessons already fetched

### Tooltip on Lesson Card
- On hover: shows full details — child name, time range, price, status
- Implemented with shadcn Tooltip (already in project)
- No click required

### Unprocessed Filter in Sidebar
- Toggle above children list (second control, below duration switcher): "лише з необробленими"
- Filters sidebar list to show only children who have at least one overdue PLANNED lesson
- Client-side filter using already-fetched week lessons data — no extra API call

---

## Data Flow

```
Dashboard page
  ├── useTeacher (selected teacher from filter)
  ├── useWeekLessons(teacherId, weekStart) → lessons for calendar + badge count
  ├── useChildren(teacherId) → sidebar children list
  └── DndContext (wraps sidebar + calendar)
        ├── DraggableChild (sidebar items)
        ├── DraggableLesson (calendar cards)
        └── DroppableSlot (each time cell in calendar)
```

Mutations:
- `createLesson` — on child drop or quick create popup submit
- `updateLesson` — on reschedule drop, mark conducted, cancel
- `deleteLesson` — on delete action
- `duplicateLesson` (createLesson +7d) — on "repeat next week"

All mutations invalidate `useWeekLessons` query on success.

---

## Error Handling

- Drop on occupied slot: visually blocked (red highlight + no-drop cursor), no API call
- Mutation errors: toast notification (existing pattern in project)
- If child has no price configured for this teacher: show warning in quick create popup, allow save anyway

---

## Out of Scope

- Push/email notifications for overdue lessons
- Touch/mobile drag-and-drop support (desktop only for now)
- Recurring lesson series management
- Bulk actions across multiple lessons
