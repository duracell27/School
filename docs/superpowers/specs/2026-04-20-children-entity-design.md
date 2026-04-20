# Design: Children (Students) Entity

## Context

The platform needs to manage students (children) who study with teachers. Admins create and manage student records. Each student can be assigned to a teacher, has contact info for parents, and tracks enrollment/graduation dates.

---

## Backend

### Prisma Schema Changes

Add to `back/prisma/schema.prisma`:

```prisma
model Child {
  id             String    @id @default(cuid())
  name           String
  age            Int
  country        String    @default("UA")  // ISO 3166-1 alpha-2 code
  avatar         String?                   // Cloudinary URL
  hireDate       DateTime?
  graduationDate DateTime?
  parentContacts Json      @default("[]")  // [{label: "Мама", phone: "+380..."}]
  timezone       String                    // e.g. "+2", "-5"
  teacherId      String?
  teacher        User?     @relation(fields: [teacherId], references: [id])
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}
```

Add to `User` model: `children Child[]`

Apply via `prisma db push` then `prisma generate`.

### Module: `ChildrenModule`

Location: `back/src/children/`

**Files:**
- `children.module.ts`
- `children.service.ts`
- `children.controller.ts`
- `dto/create-child.dto.ts`
- `dto/update-child.dto.ts`

**Service methods:** `findAll`, `findOne`, `create`, `update`, `remove`

`childSelect` projection excludes nothing sensitive but includes teacher name:
```ts
const childSelect = {
  id, name, age, country, avatar, hireDate, graduationDate,
  parentContacts, timezone, teacherId,
  teacher: { select: { id: true, name: true } },
  createdAt, updatedAt
}
```

Date fields (`hireDate`, `graduationDate`) converted from ISO string to `new Date()` in service — same pattern as users.

**Controller routes** (all guarded by `JwtAuthGuard`):
| Method | Route | Role |
|--------|-------|------|
| GET | `/children` | ADMIN |
| POST | `/children` | ADMIN |
| GET | `/children/:id` | ADMIN |
| PATCH | `/children/:id` | ADMIN |
| DELETE | `/children/:id` | ADMIN |

**DTOs:**

`create-child.dto.ts`:
- `name: string` (required)
- `age: number` (required, IsInt, Min 1)
- `country: string` (optional, default "UA")
- `avatar?: string`
- `hireDate?: string` (IsDateString)
- `graduationDate?: string` (IsDateString)
- `parentContacts?: object[]` (IsArray, IsOptional)
- `timezone: string` (required)
- `teacherId?: string` (IsOptional)

`update-child.dto.ts`: all fields optional.

Register `ChildrenModule` in `AppModule`.

---

## Frontend

### Type: `Child`

`front/src/types/child.ts`:
```ts
export interface ParentContact {
  label: string;
  phone: string;
}

export interface Child {
  id: string;
  name: string;
  age: number;
  country: string;        // ISO code e.g. "UA"
  avatar: string | null;
  hireDate: string | null;
  graduationDate: string | null;
  parentContacts: ParentContact[];
  timezone: string;
  teacherId: string | null;
  teacher: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}
```

### Hooks: `lib/children.ts`

React Query hooks following `lib/users.ts` pattern:
- `useChildren()` — GET `/children`
- `useCreateChild()` — POST `/children`, invalidates `['children']`
- `useUpdateChild()` — PATCH `/children/:id`, invalidates `['children']`
- `useDeleteChild()` — DELETE `/children/:id`, invalidates `['children']`

### Countries data: `lib/countries.ts`

Hardcoded array of `{ code: string, name: string, flag: string }` — all ~250 countries, default UA. Flag emoji derived from ISO code.

### Page: `/children`

`front/src/app/(admin)/children/page.tsx` — mirrors `/users` page structure.

Add to sidebar `navItems` in `(admin)/layout.tsx`:
```ts
{ href: '/children', label: 'Діти' }
```

### Components: `components/children/`

**`child-avatar.tsx`** — reuses same logic as `user-avatar.tsx` (initials fallback + Cloudinary thumb).

**`children-table.tsx`** — columns:
- Ім'я (avatar + name)
- Вік
- Країна (flag emoji + name)
- Таймзона
- Вчитель (name or —)
- Контакти батьків (compact: "Мама: +380..." per line)
- Дата (hire + graduation with icons, same as users-table)
- Дії (edit / delete)

**`child-modal.tsx`** — create/edit dialog:
- Avatar picker (Cloudinary upload, same pattern as user-modal)
- Ім'я (text input)
- Вік (number input)
- Країна — searchable Select, all countries with flag emoji, default UA
- Таймзона — Select with options: -12, -11, ... 0, +1, ... +14
- Контакти батьків:
  - "Номер мами" field shown by default (optional)
  - "+" button adds "Номер тата" field
  - Only non-empty fields included in payload
- Вчитель — Select populated from `useUsers()`, optional (can clear)
- Дата прийняття / Дата закінчення навчання (date inputs)
- Zod validation: name required, age required (positive int), timezone required

**`delete-dialog.tsx`** — identical pattern to `components/users/delete-dialog.tsx`.

---

## Data Flow

1. Admin opens `/children` → `useChildren()` fetches GET `/children`
2. Click "+ Створити дитину" → `child-modal.tsx` opens in create mode
3. Avatar selected → uploads to Cloudinary immediately, stores URL in state
4. Form submitted → `useCreateChild()` POSTs to `/children`
5. On success → modal closes, query `['children']` invalidated → table refreshes
6. Edit/Delete follow same pattern

---

## Verification

1. Run `prisma db push` — confirm no errors
2. Start backend `npm run start:dev` — no TypeScript errors
3. POST `/children` with valid payload → 201 with child object
4. GET `/children` → array with teacher name included
5. Frontend: navigate to `/children` — page loads, table empty
6. Create child with all fields → appears in table
7. Edit child — form pre-fills correctly, save updates table
8. Delete child — confirmation dialog, then removed from table
9. Country select: search works, flag emojis show, default UA
10. Parent contacts: + button adds second field, empty fields not sent
