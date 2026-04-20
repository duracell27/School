# Children Entity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full CRUD Children (students) entity to both backend and frontend, with country select (flag emoji + Ukrainian names), timezone, parent contacts, Cloudinary avatar, and teacher assignment.

**Architecture:** Backend follows the existing UsersModule pattern — NestJS module with service/controller/DTOs, Prisma Json field for parent contacts. Frontend mirrors the users UI — React Query hooks, table + modal + delete dialog, custom searchable CountrySelect component.

**Tech Stack:** NestJS, Prisma (PostgreSQL), class-validator, Next.js 15, React Query, Zod, react-hook-form, i18n-iso-countries, Cloudinary, Tailwind CSS, lucide-react

---

## File Map

**Backend — create:**
- `back/src/children/dto/create-child.dto.ts`
- `back/src/children/dto/update-child.dto.ts`
- `back/src/children/children.service.ts`
- `back/src/children/children.controller.ts`
- `back/src/children/children.module.ts`

**Backend — modify:**
- `back/prisma/schema.prisma` — add Child model + User.children relation
- `back/src/app.module.ts` — register ChildrenModule

**Frontend — create:**
- `front/src/types/child.ts`
- `front/src/lib/countries.ts`
- `front/src/lib/children.ts`
- `front/src/components/children/child-avatar.tsx`
- `front/src/components/children/delete-dialog.tsx`
- `front/src/components/children/country-select.tsx`
- `front/src/components/children/children-table.tsx`
- `front/src/components/children/child-modal.tsx`
- `front/src/app/(admin)/children/page.tsx`

**Frontend — modify:**
- `front/src/app/(admin)/layout.tsx` — add Діти to navItems

---

## Task 1: Prisma Schema — Add Child Model

**Files:**
- Modify: `back/prisma/schema.prisma`

- [ ] **Step 1: Add Child model and User relation to schema**

Replace the contents of `back/prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

enum Role {
  ADMIN
  TEACHER
}

enum EmploymentStatus {
  WORKING
  FIRED
}

model User {
  id               String           @id @default(cuid())
  email            String           @unique
  name             String
  password         String
  role             Role             @default(TEACHER)
  avatar           String?
  status           EmploymentStatus @default(WORKING)
  hireDate         DateTime?
  terminationDate  DateTime?
  refreshToken     String?
  children         Child[]
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
}

model Child {
  id             String    @id @default(cuid())
  name           String
  age            Int
  country        String    @default("UA")
  avatar         String?
  hireDate       DateTime?
  graduationDate DateTime?
  parentContacts Json      @default("[]")
  timezone       String
  teacherId      String?
  teacher        User?     @relation(fields: [teacherId], references: [id])
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}
```

- [ ] **Step 2: Push schema to database**

```bash
cd back && npx prisma db push
```

Expected output: `🚀  Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected output: `✔ Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
cd .. && git add back/prisma/schema.prisma && git commit -m "feat: add Child model to prisma schema"
```

---

## Task 2: Backend DTOs

**Files:**
- Create: `back/src/children/dto/create-child.dto.ts`
- Create: `back/src/children/dto/update-child.dto.ts`

- [ ] **Step 1: Create the children dto directory and create-child.dto.ts**

```bash
mkdir -p back/src/children/dto
```

Create `back/src/children/dto/create-child.dto.ts`:

```typescript
import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  IsNotEmpty,
  IsDateString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ParentContactDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class CreateChildDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  age: number;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsDateString()
  @IsOptional()
  hireDate?: string;

  @IsDateString()
  @IsOptional()
  graduationDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParentContactDto)
  @IsOptional()
  parentContacts?: ParentContactDto[];

  @IsString()
  @IsNotEmpty()
  timezone: string;

  @IsString()
  @IsOptional()
  teacherId?: string;
}
```

- [ ] **Step 2: Create update-child.dto.ts**

Create `back/src/children/dto/update-child.dto.ts`:

```typescript
import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  IsDateString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ParentContactDto } from './create-child.dto';

export class UpdateChildDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  age?: number;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsDateString()
  @IsOptional()
  hireDate?: string;

  @IsDateString()
  @IsOptional()
  graduationDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParentContactDto)
  @IsOptional()
  parentContacts?: ParentContactDto[];

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  teacherId?: string;
}
```

- [ ] **Step 3: Commit**

```bash
cd back && git add src/children/dto && git commit -m "feat: add children DTOs"
```

---

## Task 3: Children Service

**Files:**
- Create: `back/src/children/children.service.ts`

- [ ] **Step 1: Create children.service.ts**

Create `back/src/children/children.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';

const childSelect = {
  id: true,
  name: true,
  age: true,
  country: true,
  avatar: true,
  hireDate: true,
  graduationDate: true,
  parentContacts: true,
  timezone: true,
  teacherId: true,
  teacher: {
    select: { id: true, name: true },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ChildSelect;

@Injectable()
export class ChildrenService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.child.findMany({ select: childSelect });
  }

  async findOne(id: string) {
    const child = await this.prisma.child.findUnique({
      where: { id },
      select: childSelect,
    });
    if (!child) throw new NotFoundException('Child not found');
    return child;
  }

  async create(dto: CreateChildDto) {
    const { hireDate, graduationDate, ...rest } = dto;
    return this.prisma.child.create({
      data: {
        ...rest,
        country: rest.country ?? 'UA',
        parentContacts: (rest.parentContacts ?? []) as Prisma.InputJsonValue,
        ...(hireDate ? { hireDate: new Date(hireDate) } : {}),
        ...(graduationDate ? { graduationDate: new Date(graduationDate) } : {}),
      },
      select: childSelect,
    });
  }

  async update(id: string, dto: UpdateChildDto) {
    await this.findOne(id);
    const { hireDate, graduationDate, ...rest } = dto;
    const data: Prisma.ChildUpdateInput = {
      ...rest,
      ...(rest.parentContacts !== undefined
        ? { parentContacts: rest.parentContacts as Prisma.InputJsonValue }
        : {}),
      ...(hireDate ? { hireDate: new Date(hireDate) } : {}),
      ...(graduationDate ? { graduationDate: new Date(graduationDate) } : {}),
    };
    return this.prisma.child.update({
      where: { id },
      data,
      select: childSelect,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.child.delete({ where: { id } });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd back && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/children/children.service.ts && git commit -m "feat: add children service"
```

---

## Task 4: Children Controller + Module + Register in AppModule

**Files:**
- Create: `back/src/children/children.controller.ts`
- Create: `back/src/children/children.module.ts`
- Modify: `back/src/app.module.ts`

- [ ] **Step 1: Create children.controller.ts**

Create `back/src/children/children.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('children')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ChildrenController {
  constructor(private readonly children: ChildrenService) {}

  @Get()
  findAll() {
    return this.children.findAll();
  }

  @Post()
  create(@Body() dto: CreateChildDto) {
    return this.children.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.children.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateChildDto) {
    return this.children.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.children.remove(id);
  }
}
```

- [ ] **Step 2: Create children.module.ts**

Create `back/src/children/children.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ChildrenController } from './children.controller';
import { ChildrenService } from './children.service';

@Module({
  controllers: [ChildrenController],
  providers: [ChildrenService],
})
export class ChildrenModule {}
```

- [ ] **Step 3: Register ChildrenModule in AppModule**

Edit `back/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ChildrenModule } from './children/children.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    ChildrenModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd back && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/children/children.controller.ts src/children/children.module.ts src/app.module.ts && git commit -m "feat: add children controller, module, register in AppModule"
```

---

## Task 5: Frontend — Install i18n-iso-countries + Countries Lib

**Files:**
- Create: `front/src/lib/countries.ts`

- [ ] **Step 1: Install i18n-iso-countries**

`i18n-iso-countries` includes its own TypeScript types — no separate `@types` package needed.

```bash
cd front && npm install i18n-iso-countries
```

- [ ] **Step 2: Create front/src/lib/countries.ts**

```typescript
import countries from 'i18n-iso-countries';
import ukLocale from 'i18n-iso-countries/langs/uk.json';

countries.registerLocale(ukLocale);

function getFlagEmoji(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('');
}

export interface Country {
  code: string;
  name: string;
  flag: string;
}

export const COUNTRIES: Country[] = Object.entries(
  countries.getNames('uk', { select: 'official' }),
)
  .map(([code, name]) => ({ code, name, flag: getFlagEmoji(code) }))
  .sort((a, b) => a.name.localeCompare(b.name, 'uk'));

export const DEFAULT_COUNTRY = 'UA';

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}
```

- [ ] **Step 3: Verify it compiles (run Next.js dev briefly)**

```bash
npx tsc --noEmit
```

Expected: no errors about countries.ts.

- [ ] **Step 4: Commit**

```bash
git add src/lib/countries.ts package.json package-lock.json && git commit -m "feat: add countries lib with Ukrainian names and flag emojis"
```

---

## Task 6: Frontend Types + React Query Hooks

**Files:**
- Create: `front/src/types/child.ts`
- Create: `front/src/lib/children.ts`

- [ ] **Step 1: Create front/src/types/child.ts**

```typescript
export interface ParentContact {
  label: string;
  phone: string;
}

export interface Child {
  id: string;
  name: string;
  age: number;
  country: string;
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

export interface CreateChildPayload {
  name: string;
  age: number;
  country?: string;
  avatar?: string;
  hireDate?: string;
  graduationDate?: string;
  parentContacts?: ParentContact[];
  timezone: string;
  teacherId?: string;
}

export interface UpdateChildPayload {
  name?: string;
  age?: number;
  country?: string;
  avatar?: string;
  hireDate?: string;
  graduationDate?: string;
  parentContacts?: ParentContact[];
  timezone?: string;
  teacherId?: string;
}
```

- [ ] **Step 2: Create front/src/lib/children.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';
import type { Child, CreateChildPayload, UpdateChildPayload } from '@/types/child';

export function useChildren() {
  return useQuery({
    queryKey: ['children'],
    queryFn: () => apiFetch<Child[]>('/children'),
  });
}

export function useCreateChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateChildPayload) =>
      apiFetch<Child>('/children', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['children'] }),
  });
}

export function useUpdateChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateChildPayload }) =>
      apiFetch<Child>(`/children/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['children'] }),
  });
}

export function useDeleteChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/children/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['children'] }),
  });
}
```

- [ ] **Step 3: Commit**

```bash
cd front && git add src/types/child.ts src/lib/children.ts && git commit -m "feat: add Child type and React Query hooks"
```

---

## Task 7: Child Avatar + Delete Dialog Components

**Files:**
- Create: `front/src/components/children/child-avatar.tsx`
- Create: `front/src/components/children/delete-dialog.tsx`

- [ ] **Step 1: Create front/src/components/children/child-avatar.tsx**

```bash
mkdir -p front/src/components/children
```

```typescript
import Image from 'next/image';

interface ChildAvatarProps {
  name: string;
  avatar?: string | null;
  size?: number;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function toThumbUrl(url: string, size: number): string {
  return url.replace('/upload/', `/upload/w_${size},h_${size},c_fill,f_auto/`);
}

export function ChildAvatar({ name, avatar, size = 32 }: ChildAvatarProps) {
  const initials = getInitials(name);
  const style = { width: size, height: size, minWidth: size };

  if (avatar) {
    return (
      <Image
        src={toThumbUrl(avatar, size * 2)}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={style}
      />
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-medium select-none"
      style={{ ...style, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}
```

- [ ] **Step 2: Create front/src/components/children/delete-dialog.tsx**

```typescript
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeleteChild } from '@/lib/children';
import type { Child } from '@/types/child';

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  child: Child | null;
}

export function DeleteDialog({ open, onClose, child }: DeleteDialogProps) {
  const deleteChild = useDeleteChild();

  async function handleDelete() {
    if (!child) return;
    await deleteChild.mutateAsync(child.id);
    onClose();
  }

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Видалити {child?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Цю дію неможливо скасувати. Дитину буде видалено назавжди.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Скасувати</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteChild.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteChild.isPending ? 'Видалення...' : 'Видалити'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/children/ && git commit -m "feat: add ChildAvatar and DeleteDialog components"
```

---

## Task 8: CountrySelect Component

**Files:**
- Create: `front/src/components/children/country-select.tsx`

- [ ] **Step 1: Create front/src/components/children/country-select.tsx**

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { COUNTRIES, getCountry } from '@/lib/countries';

interface CountrySelectProps {
  value: string;
  onChange: (code: string) => void;
}

export function CountrySelect({ value, onChange }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = getCountry(value);

  const filtered = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full h-8 px-2.5 rounded-lg border border-input bg-transparent text-sm text-left hover:bg-muted transition-colors"
      >
        {selected ? (
          <>
            <span>{selected.flag}</span>
            <span className="truncate">{selected.name}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Оберіть країну</span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-input rounded-lg shadow-lg">
          <div className="p-2 border-b">
            <Input
              ref={inputRef}
              placeholder="Пошук країни..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-sm"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(c.code);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-2 ${
                    c.code === value ? 'bg-gray-50 font-medium' : ''
                  }`}
                >
                  <span>{c.flag}</span>
                  <span>{c.name}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-400 text-center">
                Нічого не знайдено
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/children/country-select.tsx && git commit -m "feat: add searchable CountrySelect component"
```

---

## Task 9: Children Table Component

**Files:**
- Create: `front/src/components/children/children-table.tsx`

- [ ] **Step 1: Create front/src/components/children/children-table.tsx**

```typescript
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus } from 'lucide-react';
import { ChildAvatar } from './child-avatar';
import { getCountry } from '@/lib/countries';
import type { Child } from '@/types/child';

interface ChildrenTableProps {
  children: Child[];
  onEdit: (child: Child) => void;
  onDelete: (child: Child) => void;
}

function formatDate(date: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('uk-UA');
}

export function ChildrenTable({ children, onEdit, onDelete }: ChildrenTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ім'я</TableHead>
          <TableHead>Вік</TableHead>
          <TableHead>Країна</TableHead>
          <TableHead>Таймзона</TableHead>
          <TableHead>Вчитель</TableHead>
          <TableHead>Батьки</TableHead>
          <TableHead>Дата</TableHead>
          <TableHead className="text-right">Дії</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {children.map((child) => {
          const country = getCountry(child.country);
          return (
            <TableRow key={child.id}>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <ChildAvatar name={child.name} avatar={child.avatar} size={32} />
                  <span className="font-medium">{child.name}</span>
                </div>
              </TableCell>
              <TableCell>{child.age}</TableCell>
              <TableCell>
                {country ? (
                  <span className="flex items-center gap-1.5">
                    {country.flag} {country.name}
                  </span>
                ) : (
                  child.country
                )}
              </TableCell>
              <TableCell>{child.timezone}</TableCell>
              <TableCell>{child.teacher?.name ?? '—'}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-0.5 text-xs text-gray-600">
                  {child.parentContacts.length === 0 ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    child.parentContacts.map((c, i) => (
                      <span key={i}>
                        {c.label}: {c.phone}
                      </span>
                    ))
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1 text-sm">
                  <span className="flex items-center gap-1.5 text-green-600">
                    <UserPlus size={13} />
                    {formatDate(child.hireDate)}
                  </span>
                  <span className="flex items-center gap-1.5 text-red-500">
                    <UserMinus size={13} />
                    {formatDate(child.graduationDate)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(child)}>
                  Редагувати
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(child)}>
                  Видалити
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
        {children.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-gray-400 py-8">
              Дітей не знайдено
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/children/children-table.tsx && git commit -m "feat: add ChildrenTable component"
```

---

## Task 10: Child Modal Component

**Files:**
- Create: `front/src/components/children/child-modal.tsx`

- [ ] **Step 1: Create front/src/components/children/child-modal.tsx**


Create `front/src/components/children/child-modal.tsx` with this exact content:

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateChild, useUpdateChild } from '@/lib/children';
import { useUsers } from '@/lib/users';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { DEFAULT_COUNTRY } from '@/lib/countries';
import { CountrySelect } from './country-select';
import { ChildAvatar } from './child-avatar';
import type { Child } from '@/types/child';

const TIMEZONES = [
  '-12', '-11', '-10', '-9', '-8', '-7', '-6', '-5', '-4', '-3', '-2', '-1',
  '0', '+1', '+2', '+3', '+4', '+5', '+6', '+7', '+8', '+9', '+10', '+11',
  '+12', '+13', '+14',
];

const schema = z.object({
  name: z.string().min(1, "Обов'язкове поле"),
  age: z.coerce.number().int().min(1, 'Мінімум 1'),
  hireDate: z.string().optional(),
  graduationDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ChildModalProps {
  open: boolean;
  onClose: () => void;
  child?: Child;
}

export function ChildModal({ open, onClose, child }: ChildModalProps) {
  const isEdit = !!child;
  const [submitError, setSubmitError] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [timezone, setTimezone] = useState('+2');
  const [teacherId, setTeacherId] = useState('');
  const [momPhone, setMomPhone] = useState('');
  const [dadPhone, setDadPhone] = useState('');
  const [showDad, setShowDad] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createChild = useCreateChild();
  const updateChild = useUpdateChild();
  const { data: users = [] } = useUsers();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const currentName = watch('name') || child?.name || '';

  useEffect(() => {
    setSubmitError('');
    setAvatarPreview(null);
    if (child) {
      reset({
        name: child.name,
        age: child.age,
        hireDate: child.hireDate ? child.hireDate.slice(0, 10) : '',
        graduationDate: child.graduationDate ? child.graduationDate.slice(0, 10) : '',
      });
      setAvatarUrl(child.avatar ?? null);
      setCountry(child.country);
      setTimezone(child.timezone);
      setTeacherId(child.teacherId ?? '');
      const mom = child.parentContacts.find((c) => c.label === 'Мама');
      const dad = child.parentContacts.find((c) => c.label === 'Тато');
      setMomPhone(mom?.phone ?? '');
      setDadPhone(dad?.phone ?? '');
      setShowDad(!!dad);
    } else {
      reset({ name: '', age: undefined as never, hireDate: '', graduationDate: '' });
      setAvatarUrl(null);
      setCountry(DEFAULT_COUNTRY);
      setTimezone('+2');
      setTeacherId('');
      setMomPhone('');
      setDadPhone('');
      setShowDad(false);
    }
  }, [child, open]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);
    try {
      const url = await uploadToCloudinary(file);
      setAvatarUrl(url);
    } catch {
      setSubmitError('Помилка завантаження фото');
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function onSubmit(data: FormValues) {
    try {
      const parentContacts = [
        ...(momPhone.trim() ? [{ label: 'Мама', phone: momPhone.trim() }] : []),
        ...(dadPhone.trim() ? [{ label: 'Тато', phone: dadPhone.trim() }] : []),
      ];

      const payload = {
        name: data.name,
        age: data.age,
        country,
        timezone,
        parentContacts,
        ...(avatarUrl ? { avatar: avatarUrl } : {}),
        ...(teacherId ? { teacherId } : {}),
        ...(data.hireDate ? { hireDate: data.hireDate } : {}),
        ...(data.graduationDate ? { graduationDate: data.graduationDate } : {}),
      };

      if (isEdit) {
        await updateChild.mutateAsync({ id: child.id, data: payload });
      } else {
        await createChild.mutateAsync(payload);
      }
      onClose();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Щось пішло не так');
    }
  }

  const displayAvatar = avatarPreview ?? avatarUrl;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редагувати дитину' : 'Додати дитину'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative group shrink-0"
            >
              {displayAvatar ? (
                <div className="w-14 h-14 rounded-full overflow-hidden">
                  <Image src={displayAvatar} alt="avatar" width={56} height={56} className="w-full h-full object-cover" />
                </div>
              ) : (
                <ChildAvatar name={currentName || '?'} size={56} />
              )}
              <span className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs">
                {uploadingAvatar ? '...' : 'Фото'}
              </span>
            </button>
            <div className="text-sm text-gray-500">
              {uploadingAvatar ? 'Завантаження...' : 'Натисніть на аватар щоб змінити фото'}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="child-name">Ім'я</Label>
              <Input id="child-name" {...register('name')} />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="child-age">Вік</Label>
              <Input id="child-age" type="number" min={1} {...register('age')} />
              {errors.age && <p className="text-sm text-red-500">{errors.age.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Країна</Label>
              <CountrySelect value={country} onChange={setCountry} />
            </div>
            <div className="space-y-1">
              <Label>Таймзона</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue>{timezone}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Контакти батьків</Label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Номер мами"
                value={momPhone}
                onChange={(e) => setMomPhone(e.target.value)}
              />
              {!showDad && (
                <button
                  type="button"
                  onClick={() => setShowDad(true)}
                  className="shrink-0 w-8 h-8 rounded-lg border border-input flex items-center justify-center text-gray-500 hover:bg-muted transition-colors text-lg leading-none"
                >
                  +
                </button>
              )}
            </div>
            {showDad && (
              <Input
                placeholder="Номер тата"
                value={dadPhone}
                onChange={(e) => setDadPhone(e.target.value)}
              />
            )}
          </div>

          <div className="space-y-1">
            <Label>Вчитель</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger>
                <SelectValue>
                  {teacherId
                    ? (users.find((u) => u.id === teacherId)?.name ?? 'Вчитель')
                    : 'Без вчителя'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Без вчителя</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="child-hireDate">Дата прийняття</Label>
              <Input id="child-hireDate" type="date" {...register('hireDate')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="child-graduationDate">Дата закінчення</Label>
              <Input id="child-graduationDate" type="date" {...register('graduationDate')} />
            </div>
          </div>

          {submitError && <p className="text-sm text-red-500">{submitError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Скасувати</Button>
            <Button type="submit" disabled={isSubmitting || uploadingAvatar}>
              {isEdit ? 'Зберегти' : 'Створити'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/children/child-modal.tsx && git commit -m "feat: add ChildModal component"
```

---

## Task 11: Children Page + Sidebar

**Files:**
- Create: `front/src/app/(admin)/children/page.tsx`
- Modify: `front/src/app/(admin)/layout.tsx`

- [ ] **Step 1: Create the children page directory**

```bash
mkdir -p "front/src/app/(admin)/children"
```

- [ ] **Step 2: Create front/src/app/(admin)/children/page.tsx**

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChildrenTable } from '@/components/children/children-table';
import { ChildModal } from '@/components/children/child-modal';
import { DeleteDialog } from '@/components/children/delete-dialog';
import { useChildren } from '@/lib/children';
import type { Child } from '@/types/child';

type ModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; child: Child };

type DeleteState = { open: false } | { open: true; child: Child };

export default function ChildrenPage() {
  const { data: children = [], isLoading, error } = useChildren();
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false });

  if (isLoading) return <p className="text-gray-500">Завантаження...</p>;
  if (error) return <p className="text-red-500">Помилка завантаження дітей</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Діти</h2>
        <Button onClick={() => setModal({ open: true, mode: 'create' })}>
          + Додати дитину
        </Button>
      </div>

      <div className="bg-white rounded-lg border">
        <ChildrenTable
          children={children}
          onEdit={(child) => setModal({ open: true, mode: 'edit', child })}
          onDelete={(child) => setDeleteState({ open: true, child })}
        />
      </div>

      <ChildModal
        open={modal.open}
        child={modal.open && modal.mode === 'edit' ? modal.child : undefined}
        onClose={() => setModal({ open: false })}
      />

      <DeleteDialog
        open={deleteState.open}
        child={deleteState.open ? deleteState.child : null}
        onClose={() => setDeleteState({ open: false })}
      />
    </div>
  );
}
```

- [ ] **Step 3: Add Діти to sidebar in layout.tsx**

In `front/src/app/(admin)/layout.tsx`, update the `navItems` array:

```typescript
const navItems = [
  { href: '/users', label: 'Користувачі' },
  { href: '/children', label: 'Діти' },
];
```

- [ ] **Step 4: Run TypeScript check**

```bash
cd front && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(admin)/children/" "src/app/(admin)/layout.tsx" && git commit -m "feat: add children page and sidebar link"
```
