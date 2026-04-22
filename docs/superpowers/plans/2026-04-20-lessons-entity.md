# Lessons & LessonPrices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full CRUD Lesson and LessonPrice entities — backend (NestJS/Prisma) + frontend (table pages, lesson modal with price auto-fill, weekly dashboard calendar).

**Architecture:** Backend follows ChildrenModule pattern. Lessons allow ADMIN+TEACHER access with ownership checks in service layer. Frontend mirrors Children UI for table pages; dashboard uses a custom CSS-grid week calendar with absolute-positioned lesson cards.

**Tech Stack:** NestJS, Prisma (PostgreSQL), class-validator, Next.js 15, React Query, Zod, react-hook-form, Tailwind CSS, lucide-react, Zustand (session store)

---

## File Map

**Backend — create:**
- `back/src/lesson-prices/dto/create-lesson-price.dto.ts`
- `back/src/lesson-prices/dto/update-lesson-price.dto.ts`
- `back/src/lesson-prices/lesson-prices.service.ts`
- `back/src/lesson-prices/lesson-prices.controller.ts`
- `back/src/lesson-prices/lesson-prices.module.ts`
- `back/src/lessons/dto/create-lesson.dto.ts`
- `back/src/lessons/dto/update-lesson.dto.ts`
- `back/src/lessons/dto/lesson-query.dto.ts`
- `back/src/lessons/lessons.service.ts`
- `back/src/lessons/lessons.controller.ts`
- `back/src/lessons/lessons.module.ts`

**Backend — modify:**
- `back/prisma/schema.prisma`
- `back/src/app.module.ts`

**Frontend — create:**
- `front/src/types/lesson.ts`
- `front/src/lib/lessons.ts`
- `front/src/components/lesson-prices/lesson-prices-table.tsx`
- `front/src/components/lesson-prices/lesson-price-modal.tsx`
- `front/src/components/lesson-prices/delete-dialog.tsx`
- `front/src/components/lessons/lessons-table.tsx`
- `front/src/components/lessons/lesson-modal.tsx`
- `front/src/components/lessons/delete-dialog.tsx`
- `front/src/components/dashboard/week-calendar.tsx`
- `front/src/app/(admin)/lesson-prices/page.tsx`
- `front/src/app/(admin)/lessons/page.tsx`
- `front/src/app/(admin)/dashboard/page.tsx`

**Frontend — modify:**
- `front/src/app/(admin)/layout.tsx`

---

## Task 1: Prisma Schema — Add LessonStatus, Lesson, LessonPrice

**Files:**
- Modify: `back/prisma/schema.prisma`

- [ ] **Step 1: Replace schema.prisma with updated content**

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

enum LessonStatus {
  PLANNED
  CONDUCTED
  CANCELLED
  RESCHEDULED
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
  lessons          Lesson[]
  lessonPrices     LessonPrice[]
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
}

model Child {
  id             String        @id @default(cuid())
  name           String
  age            Int
  country        String        @default("UA")
  avatar         String?
  hireDate       DateTime?
  graduationDate DateTime?
  parentContacts Json          @default("[]")
  timezone       String
  teacherId      String?
  teacher        User?         @relation(fields: [teacherId], references: [id], onDelete: SetNull)
  lessons        Lesson[]
  lessonPrices   LessonPrice[]
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
}

model Lesson {
  id                String       @id @default(cuid())
  childId           String
  child             Child        @relation(fields: [childId], references: [id], onDelete: Cascade)
  teacherId         String
  teacher           User         @relation(fields: [teacherId], references: [id], onDelete: Restrict)
  status            LessonStatus @default(PLANNED)
  startDate         DateTime
  endDate           DateTime
  price             Decimal
  originalStartDate DateTime?
  originalEndDate   DateTime?
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
}

model LessonPrice {
  id            String   @id @default(cuid())
  childId       String
  child         Child    @relation(fields: [childId], references: [id], onDelete: Cascade)
  teacherId     String
  teacher       User     @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  price         Decimal
  effectiveDate DateTime
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

- [ ] **Step 2: Push schema to database**

```bash
cd /path/to/project/back && npx prisma db push
```

Expected: `🚀  Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
cd .. && git add back/prisma/schema.prisma && git commit -m "feat: add LessonStatus enum, Lesson and LessonPrice models to schema"
```

---

## Task 2: LessonPrice Backend (DTOs + Service + Controller + Module)

**Files:**
- Create: `back/src/lesson-prices/dto/create-lesson-price.dto.ts`
- Create: `back/src/lesson-prices/dto/update-lesson-price.dto.ts`
- Create: `back/src/lesson-prices/lesson-prices.service.ts`
- Create: `back/src/lesson-prices/lesson-prices.controller.ts`
- Create: `back/src/lesson-prices/lesson-prices.module.ts`
- Modify: `back/src/app.module.ts`

- [ ] **Step 1: Create DTOs directory and create-lesson-price.dto.ts**

```bash
mkdir -p back/src/lesson-prices/dto
```

Create `back/src/lesson-prices/dto/create-lesson-price.dto.ts`:

```typescript
import { IsString, IsNotEmpty, IsNumber, IsPositive, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLessonPriceDto {
  @IsString()
  @IsNotEmpty()
  childId: string;

  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price: number;

  @IsDateString()
  effectiveDate: string;
}
```

- [ ] **Step 2: Create update-lesson-price.dto.ts**

Create `back/src/lesson-prices/dto/update-lesson-price.dto.ts`:

```typescript
import { IsString, IsNumber, IsPositive, IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateLessonPriceDto {
  @IsString()
  @IsOptional()
  childId?: string;

  @IsString()
  @IsOptional()
  teacherId?: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  @IsOptional()
  price?: number;

  @IsDateString()
  @IsOptional()
  effectiveDate?: string;
}
```

- [ ] **Step 3: Create lesson-prices.service.ts**

Create `back/src/lesson-prices/lesson-prices.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonPriceDto } from './dto/create-lesson-price.dto';
import { UpdateLessonPriceDto } from './dto/update-lesson-price.dto';

const lessonPriceSelect = {
  id: true,
  child: { select: { id: true, name: true } },
  teacher: { select: { id: true, name: true } },
  price: true,
  effectiveDate: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LessonPriceSelect;

@Injectable()
export class LessonPricesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.lessonPrice.findMany({
      select: lessonPriceSelect,
      orderBy: { effectiveDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const lp = await this.prisma.lessonPrice.findUnique({
      where: { id },
      select: lessonPriceSelect,
    });
    if (!lp) throw new NotFoundException('LessonPrice not found');
    return lp;
  }

  create(dto: CreateLessonPriceDto) {
    return this.prisma.lessonPrice.create({
      data: {
        childId: dto.childId,
        teacherId: dto.teacherId,
        price: dto.price,
        effectiveDate: new Date(dto.effectiveDate),
      },
      select: lessonPriceSelect,
    });
  }

  async update(id: string, dto: UpdateLessonPriceDto) {
    await this.findOne(id);
    return this.prisma.lessonPrice.update({
      where: { id },
      data: {
        ...(dto.childId !== undefined ? { childId: dto.childId } : {}),
        ...(dto.teacherId !== undefined ? { teacherId: dto.teacherId } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.effectiveDate ? { effectiveDate: new Date(dto.effectiveDate) } : {}),
      },
      select: lessonPriceSelect,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.lessonPrice.delete({ where: { id } });
  }
}
```

- [ ] **Step 4: Create lesson-prices.controller.ts**

Create `back/src/lesson-prices/lesson-prices.controller.ts`:

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
  HttpCode,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { LessonPricesService } from './lesson-prices.service';
import { CreateLessonPriceDto } from './dto/create-lesson-price.dto';
import { UpdateLessonPriceDto } from './dto/update-lesson-price.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('lesson-prices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class LessonPricesController {
  constructor(private readonly lessonPrices: LessonPricesService) {}

  @Get()
  findAll() {
    return this.lessonPrices.findAll();
  }

  @Post()
  create(@Body() dto: CreateLessonPriceDto) {
    return this.lessonPrices.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lessonPrices.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLessonPriceDto) {
    return this.lessonPrices.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.lessonPrices.remove(id);
  }
}
```

- [ ] **Step 5: Create lesson-prices.module.ts**

Create `back/src/lesson-prices/lesson-prices.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LessonPricesController } from './lesson-prices.controller';
import { LessonPricesService } from './lesson-prices.service';

@Module({
  imports: [AuthModule],
  controllers: [LessonPricesController],
  providers: [LessonPricesService],
  exports: [LessonPricesService],
})
export class LessonPricesModule {}
```

- [ ] **Step 6: Register in AppModule**

Update `back/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ChildrenModule } from './children/children.module';
import { LessonPricesModule } from './lesson-prices/lesson-prices.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    ChildrenModule,
    LessonPricesModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd back && npx tsc --noEmit
```

Expected: no new errors (6 pre-existing spec errors in test files are ignored).

- [ ] **Step 8: Commit**

```bash
cd .. && git add back/src/lesson-prices/ back/src/app.module.ts && git commit -m "feat: add LessonPrices backend — DTOs, service, controller, module"
```

---

## Task 3: Lesson DTOs

**Files:**
- Create: `back/src/lessons/dto/create-lesson.dto.ts`
- Create: `back/src/lessons/dto/update-lesson.dto.ts`
- Create: `back/src/lessons/dto/lesson-query.dto.ts`

- [ ] **Step 1: Create dto directory and create-lesson.dto.ts**

```bash
mkdir -p back/src/lessons/dto
```

Create `back/src/lessons/dto/create-lesson.dto.ts`:

```typescript
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsDateString,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LessonStatus } from '@prisma/client';

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty()
  childId: string;

  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @IsEnum(LessonStatus)
  @IsOptional()
  status?: LessonStatus;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price: number;

  @IsDateString()
  @IsOptional()
  originalStartDate?: string;

  @IsDateString()
  @IsOptional()
  originalEndDate?: string;
}
```

- [ ] **Step 2: Create update-lesson.dto.ts**

Create `back/src/lessons/dto/update-lesson.dto.ts`:

```typescript
import {
  IsString,
  IsNumber,
  IsPositive,
  IsDateString,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LessonStatus } from '@prisma/client';

export class UpdateLessonDto {
  @IsString()
  @IsOptional()
  childId?: string;

  @IsString()
  @IsOptional()
  teacherId?: string;

  @IsEnum(LessonStatus)
  @IsOptional()
  status?: LessonStatus;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  @IsOptional()
  price?: number;

  @IsDateString()
  @IsOptional()
  originalStartDate?: string;

  @IsDateString()
  @IsOptional()
  originalEndDate?: string;
}
```

- [ ] **Step 3: Create lesson-query.dto.ts**

Create `back/src/lessons/dto/lesson-query.dto.ts`:

```typescript
import { IsString, IsDateString, IsOptional } from 'class-validator';

export class LessonQueryDto {
  @IsString()
  @IsOptional()
  teacherId?: string;

  @IsDateString()
  @IsOptional()
  weekStart?: string;
}
```

- [ ] **Step 4: Commit**

```bash
git add back/src/lessons/dto && git commit -m "feat: add lesson DTOs"
```

---

## Task 4: Lesson Service

**Files:**
- Create: `back/src/lessons/lessons.service.ts`

- [ ] **Step 1: Create lessons.service.ts**

Create `back/src/lessons/lessons.service.ts`:

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LessonQueryDto } from './dto/lesson-query.dto';

const lessonSelect = {
  id: true,
  child: { select: { id: true, name: true } },
  teacher: { select: { id: true, name: true } },
  status: true,
  startDate: true,
  endDate: true,
  price: true,
  originalStartDate: true,
  originalEndDate: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LessonSelect;

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string, userRole: Role, query: LessonQueryDto) {
    const { teacherId, weekStart } = query;
    const where: Prisma.LessonWhereInput = {};

    if (userRole === Role.TEACHER) {
      where.teacherId = userId;
    } else if (teacherId) {
      where.teacherId = teacherId;
    }

    if (weekStart) {
      const start = new Date(weekStart);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      where.startDate = { gte: start, lt: end };
    }

    return this.prisma.lesson.findMany({
      where,
      select: lessonSelect,
      orderBy: { startDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      select: lessonSelect,
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    return lesson;
  }

  async getPriceSuggestion(
    childId: string,
    teacherId: string,
    startDate: string,
  ): Promise<number | null> {
    const lp = await this.prisma.lessonPrice.findFirst({
      where: {
        childId,
        teacherId,
        effectiveDate: { lte: new Date(startDate) },
      },
      orderBy: { effectiveDate: 'desc' },
    });
    return lp ? Number(lp.price) : null;
  }

  async create(dto: CreateLessonDto, userId: string, userRole: Role) {
    if (userRole === Role.TEACHER) {
      const child = await this.prisma.child.findUnique({
        where: { id: dto.childId },
        select: { teacherId: true },
      });
      if (!child) throw new NotFoundException('Child not found');
      if (child.teacherId !== userId) {
        throw new ForbiddenException(
          'You can only create lessons for your assigned students',
        );
      }
    }

    const { startDate, endDate, originalStartDate, originalEndDate, ...rest } = dto;
    return this.prisma.lesson.create({
      data: {
        ...rest,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        ...(originalStartDate ? { originalStartDate: new Date(originalStartDate) } : {}),
        ...(originalEndDate ? { originalEndDate: new Date(originalEndDate) } : {}),
      },
      select: lessonSelect,
    });
  }

  async update(id: string, dto: UpdateLessonDto, userId: string, userRole: Role) {
    const lesson = await this.findOne(id);

    if (userRole === Role.TEACHER && lesson.teacher.id !== userId) {
      throw new ForbiddenException('You can only edit your own lessons');
    }

    const { startDate, endDate, originalStartDate, originalEndDate, ...rest } = dto;
    return this.prisma.lesson.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate ? { endDate: new Date(endDate) } : {}),
        ...(originalStartDate ? { originalStartDate: new Date(originalStartDate) } : {}),
        ...(originalEndDate ? { originalEndDate: new Date(originalEndDate) } : {}),
      },
      select: lessonSelect,
    });
  }

  async remove(id: string, userId: string, userRole: Role): Promise<void> {
    const lesson = await this.findOne(id);

    if (userRole === Role.TEACHER && lesson.teacher.id !== userId) {
      throw new ForbiddenException('You can only delete your own lessons');
    }

    await this.prisma.lesson.delete({ where: { id } });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd back && npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd .. && git add back/src/lessons/lessons.service.ts && git commit -m "feat: add lessons service with permission checks and price suggestion"
```

---

## Task 5: Lesson Controller + Module + AppModule

**Files:**
- Create: `back/src/lessons/lessons.controller.ts`
- Create: `back/src/lessons/lessons.module.ts`
- Modify: `back/src/app.module.ts`

- [ ] **Step 1: Create lessons.controller.ts**

Create `back/src/lessons/lessons.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LessonQueryDto } from './dto/lesson-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface JwtUser {
  sub: string;
  role: Role;
}

@Controller('lessons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER)
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  @Get()
  findAll(@Query() query: LessonQueryDto, @Req() req: Request) {
    const user = req['user'] as JwtUser;
    return this.lessons.findAll(user.sub, user.role, query);
  }

  // Must be defined before :id to avoid routing conflict
  @Get('price-suggestion')
  getPriceSuggestion(
    @Query('childId') childId: string,
    @Query('teacherId') teacherId: string,
    @Query('startDate') startDate: string,
  ) {
    return this.lessons.getPriceSuggestion(childId, teacherId, startDate);
  }

  @Post()
  create(@Body() dto: CreateLessonDto, @Req() req: Request) {
    const user = req['user'] as JwtUser;
    return this.lessons.create(dto, user.sub, user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lessons.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLessonDto, @Req() req: Request) {
    const user = req['user'] as JwtUser;
    return this.lessons.update(id, dto, user.sub, user.role);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @Req() req: Request) {
    const user = req['user'] as JwtUser;
    return this.lessons.remove(id, user.sub, user.role);
  }
}
```

- [ ] **Step 2: Create lessons.module.ts**

Create `back/src/lessons/lessons.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LessonPricesModule } from '../lesson-prices/lesson-prices.module';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

@Module({
  imports: [AuthModule, LessonPricesModule],
  controllers: [LessonsController],
  providers: [LessonsService],
})
export class LessonsModule {}
```

- [ ] **Step 3: Register LessonsModule in AppModule**

Update `back/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ChildrenModule } from './children/children.module';
import { LessonPricesModule } from './lesson-prices/lesson-prices.module';
import { LessonsModule } from './lessons/lessons.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    ChildrenModule,
    LessonPricesModule,
    LessonsModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd back && npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
cd .. && git add back/src/lessons/ back/src/app.module.ts && git commit -m "feat: add lessons controller, module, register in AppModule"
```

---

## Task 6: Frontend Types + React Query Hooks

**Files:**
- Create: `front/src/types/lesson.ts`
- Create: `front/src/lib/lessons.ts`

- [ ] **Step 1: Create front/src/types/lesson.ts**

```typescript
export type LessonStatus = 'PLANNED' | 'CONDUCTED' | 'CANCELLED' | 'RESCHEDULED';

export interface LessonChild {
  id: string;
  name: string;
}

export interface LessonTeacher {
  id: string;
  name: string;
}

export interface Lesson {
  id: string;
  child: LessonChild;
  teacher: LessonTeacher;
  status: LessonStatus;
  startDate: string;
  endDate: string;
  price: string; // Decimal serialized as string by Prisma
  originalStartDate: string | null;
  originalEndDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLessonPayload {
  childId: string;
  teacherId: string;
  status?: LessonStatus;
  startDate: string;
  endDate: string;
  price: number;
  originalStartDate?: string;
  originalEndDate?: string;
}

export interface UpdateLessonPayload {
  childId?: string;
  teacherId?: string;
  status?: LessonStatus;
  startDate?: string;
  endDate?: string;
  price?: number;
  originalStartDate?: string;
  originalEndDate?: string;
}

export interface LessonPrice {
  id: string;
  child: LessonChild;
  teacher: LessonTeacher;
  price: string;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLessonPricePayload {
  childId: string;
  teacherId: string;
  price: number;
  effectiveDate: string;
}

export interface UpdateLessonPricePayload {
  childId?: string;
  teacherId?: string;
  price?: number;
  effectiveDate?: string;
}
```

- [ ] **Step 2: Create front/src/lib/lessons.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';
import type {
  Lesson,
  LessonPrice,
  CreateLessonPayload,
  UpdateLessonPayload,
  CreateLessonPricePayload,
  UpdateLessonPricePayload,
} from '@/types/lesson';

export function useLessons(filters: { teacherId?: string; weekStart?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.teacherId) params.set('teacherId', filters.teacherId);
  if (filters.weekStart) params.set('weekStart', filters.weekStart);
  const qs = params.toString();
  return useQuery({
    queryKey: ['lessons', filters],
    queryFn: () => apiFetch<Lesson[]>(`/lessons${qs ? `?${qs}` : ''}`),
  });
}

export function useCreateLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLessonPayload) =>
      apiFetch<Lesson>('/lessons', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lessons'] }),
  });
}

export function useUpdateLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLessonPayload }) =>
      apiFetch<Lesson>(`/lessons/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lessons'] }),
  });
}

export function useDeleteLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/lessons/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lessons'] }),
  });
}

export function usePriceSuggestion(
  childId: string | null,
  teacherId: string | null,
  startDate: string | null,
) {
  return useQuery({
    queryKey: ['price-suggestion', childId, teacherId, startDate],
    queryFn: () =>
      apiFetch<number | null>(
        `/lessons/price-suggestion?childId=${childId}&teacherId=${teacherId}&startDate=${encodeURIComponent(startDate!)}`,
      ),
    enabled: !!(childId && teacherId && startDate),
  });
}

export function useLessonPrices() {
  return useQuery({
    queryKey: ['lesson-prices'],
    queryFn: () => apiFetch<LessonPrice[]>('/lesson-prices'),
  });
}

export function useCreateLessonPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLessonPricePayload) =>
      apiFetch<LessonPrice>('/lesson-prices', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lesson-prices'] }),
  });
}

export function useUpdateLessonPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLessonPricePayload }) =>
      apiFetch<LessonPrice>(`/lesson-prices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lesson-prices'] }),
  });
}

export function useDeleteLessonPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/lesson-prices/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lesson-prices'] }),
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add front/src/types/lesson.ts front/src/lib/lessons.ts && git commit -m "feat: add Lesson/LessonPrice types and React Query hooks"
```

---

## Task 7: LessonPrice Frontend (Table + Modal + DeleteDialog + Page)

**Files:**
- Create: `front/src/components/lesson-prices/lesson-prices-table.tsx`
- Create: `front/src/components/lesson-prices/lesson-price-modal.tsx`
- Create: `front/src/components/lesson-prices/delete-dialog.tsx`
- Create: `front/src/app/(admin)/lesson-prices/page.tsx`

- [ ] **Step 1: Create directory**

```bash
mkdir -p front/src/components/lesson-prices front/src/app/\(admin\)/lesson-prices
```

- [ ] **Step 2: Create lesson-prices-table.tsx**

Create `front/src/components/lesson-prices/lesson-prices-table.tsx`:

```typescript
'use client';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { LessonPrice } from '@/types/lesson';

interface LessonPricesTableProps {
  prices: LessonPrice[];
  onEdit: (price: LessonPrice) => void;
  onDelete: (price: LessonPrice) => void;
}

export function LessonPricesTable({ prices, onEdit, onDelete }: LessonPricesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Учень</TableHead>
          <TableHead>Вчитель</TableHead>
          <TableHead>Ціна (грн)</TableHead>
          <TableHead>Діє з</TableHead>
          <TableHead className="text-right">Дії</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {prices.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="font-medium">{p.child.name}</TableCell>
            <TableCell>{p.teacher.name}</TableCell>
            <TableCell>{Number(p.price).toLocaleString('uk-UA')}</TableCell>
            <TableCell>
              {new Date(p.effectiveDate).toLocaleDateString('uk-UA')}
            </TableCell>
            <TableCell className="text-right space-x-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(p)}>
                Редагувати
              </Button>
              <Button variant="destructive" size="sm" onClick={() => onDelete(p)}>
                Видалити
              </Button>
            </TableCell>
          </TableRow>
        ))}
        {prices.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-gray-400 py-8">
              Записів не знайдено
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 3: Create lesson-price-modal.tsx**

Create `front/src/components/lesson-prices/lesson-price-modal.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useCreateLessonPrice, useUpdateLessonPrice } from '@/lib/lessons';
import { useChildren } from '@/lib/children';
import { useUsers } from '@/lib/users';
import type { LessonPrice } from '@/types/lesson';

const schema = z.object({
  price: z.coerce.number().positive('Вкажіть ціну'),
  effectiveDate: z.string().min(1, "Обов'язкове поле"),
});

type FormValues = z.infer<typeof schema>;

interface LessonPriceModalProps {
  open: boolean;
  onClose: () => void;
  price?: LessonPrice;
}

export function LessonPriceModal({ open, onClose, price }: LessonPriceModalProps) {
  const isEdit = !!price;
  const [submitError, setSubmitError] = useState('');
  const [childId, setChildId] = useState('');
  const [teacherId, setTeacherId] = useState('');

  const createPrice = useCreateLessonPrice();
  const updatePrice = useUpdateLessonPrice();
  const { data: children = [] } = useChildren();
  const { data: users = [] } = useUsers();

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues> });

  useEffect(() => {
    setSubmitError('');
    if (price) {
      reset({
        price: Number(price.price),
        effectiveDate: price.effectiveDate.slice(0, 10),
      });
      setChildId(price.child.id);
      setTeacherId(price.teacher.id);
    } else {
      reset({ price: undefined as never, effectiveDate: '' });
      setChildId('');
      setTeacherId('');
    }
  }, [price, open]);

  async function onSubmit(data: FormValues) {
    if (!childId || !teacherId) {
      setSubmitError('Оберіть учня та вчителя');
      return;
    }
    try {
      const payload = {
        childId,
        teacherId,
        price: data.price,
        effectiveDate: data.effectiveDate,
      };
      if (isEdit) {
        await updatePrice.mutateAsync({ id: price.id, data: payload });
      } else {
        await createPrice.mutateAsync(payload);
      }
      onClose();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Щось пішло не так');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редагувати ціну' : 'Додати ціну'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Учень</Label>
            <Select value={childId} onValueChange={(v) => setChildId(v ?? '')}>
              <SelectTrigger>
                <SelectValue>{children.find((c) => c.id === childId)?.name ?? 'Оберіть учня'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {children.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Вчитель</Label>
            <Select value={teacherId} onValueChange={(v) => setTeacherId(v ?? '')}>
              <SelectTrigger>
                <SelectValue>{users.find((u) => u.id === teacherId)?.name ?? 'Оберіть вчителя'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="lp-price">Ціна (грн)</Label>
              <Input id="lp-price" type="number" min={1} step="0.01" {...register('price')} />
              {errors.price && <p className="text-sm text-red-500">{errors.price.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lp-date">Діє з</Label>
              <Input id="lp-date" type="date" {...register('effectiveDate')} />
              {errors.effectiveDate && <p className="text-sm text-red-500">{errors.effectiveDate.message}</p>}
            </div>
          </div>

          {submitError && <p className="text-sm text-red-500">{submitError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Скасувати</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? 'Зберегти' : 'Створити'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Create delete-dialog.tsx for lesson-prices**

Create `front/src/components/lesson-prices/delete-dialog.tsx`:

```typescript
'use client';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeleteLessonPrice } from '@/lib/lessons';
import type { LessonPrice } from '@/types/lesson';

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  price: LessonPrice | null;
}

export function DeleteDialog({ open, onClose, price }: DeleteDialogProps) {
  const deleteMutation = useDeleteLessonPrice();

  async function handleDelete() {
    if (!price) return;
    await deleteMutation.mutateAsync(price.id);
    onClose();
  }

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Видалити запис ціни?</AlertDialogTitle>
          <AlertDialogDescription>
            {price?.child.name} — {price?.teacher.name} — {price ? Number(price.price).toLocaleString('uk-UA') : ''} грн.
            Цю дію неможливо скасувати.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Скасувати</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteMutation.isPending ? 'Видалення...' : 'Видалити'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 5: Create lesson-prices page**

Create `front/src/app/(admin)/lesson-prices/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LessonPricesTable } from '@/components/lesson-prices/lesson-prices-table';
import { LessonPriceModal } from '@/components/lesson-prices/lesson-price-modal';
import { DeleteDialog } from '@/components/lesson-prices/delete-dialog';
import { useLessonPrices } from '@/lib/lessons';
import type { LessonPrice } from '@/types/lesson';

type ModalState = { open: false } | { open: true; mode: 'create' } | { open: true; mode: 'edit'; price: LessonPrice };
type DeleteState = { open: false } | { open: true; price: LessonPrice };

export default function LessonPricesPage() {
  const { data: prices = [], isLoading, error } = useLessonPrices();
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false });

  if (isLoading) return <p className="text-gray-500">Завантаження...</p>;
  if (error) return <p className="text-red-500">Помилка завантаження</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Вартість заняття{' '}
          <span className="text-sm font-normal text-gray-400">({prices.length})</span>
        </h2>
        <Button onClick={() => setModal({ open: true, mode: 'create' })}>
          + Додати ціну
        </Button>
      </div>

      <div className="bg-white rounded-lg border">
        <LessonPricesTable
          prices={prices}
          onEdit={(price) => setModal({ open: true, mode: 'edit', price })}
          onDelete={(price) => setDeleteState({ open: true, price })}
        />
      </div>

      <LessonPriceModal
        open={modal.open}
        price={modal.open && modal.mode === 'edit' ? modal.price : undefined}
        onClose={() => setModal({ open: false })}
      />

      <DeleteDialog
        open={deleteState.open}
        price={deleteState.open ? deleteState.price : null}
        onClose={() => setDeleteState({ open: false })}
      />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add front/src/components/lesson-prices/ "front/src/app/(admin)/lesson-prices/" && git commit -m "feat: add LessonPrice frontend — table, modal, delete dialog, page"
```

---

## Task 8: Lessons Table + Delete Dialog

**Files:**
- Create: `front/src/components/lessons/lessons-table.tsx`
- Create: `front/src/components/lessons/delete-dialog.tsx`

- [ ] **Step 1: Create directory**

```bash
mkdir -p front/src/components/lessons
```

- [ ] **Step 2: Create lessons-table.tsx**

Create `front/src/components/lessons/lessons-table.tsx`:

```typescript
'use client';

import { useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { Lesson, LessonStatus } from '@/types/lesson';

interface LessonsTableProps {
  lessons: Lesson[];
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
}

const STATUS_LABELS: Record<LessonStatus, string> = {
  PLANNED: 'Заплановано',
  CONDUCTED: 'Проведено',
  CANCELLED: 'Скасовано',
  RESCHEDULED: 'Перенесено',
};

const STATUS_COLORS: Record<LessonStatus, string> = {
  PLANNED: 'bg-blue-100 text-blue-700',
  CONDUCTED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  RESCHEDULED: 'bg-orange-100 text-orange-700',
};

function fmtDateTime(dt: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

type SortKey = 'child' | 'teacher' | 'status' | 'startDate';
type SortDir = 'asc' | 'desc' | null;

function SortBtn({
  label, col, activeCol, dir, onToggle,
}: {
  label: string; col: SortKey; activeCol: SortKey | null;
  dir: SortDir; onToggle: (c: SortKey) => void;
}) {
  const active = activeCol === col;
  const Icon = active && dir === 'asc' ? ArrowUp : active && dir === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <button onClick={() => onToggle(col)} className="flex items-center gap-1 hover:opacity-80 transition-opacity">
      {label} <Icon size={13} className={active ? 'opacity-100' : 'opacity-40'} />
    </button>
  );
}

export function LessonsTable({ lessons, onEdit, onDelete }: LessonsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  function handleSort(key: SortKey) {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); }
    else {
      setSortDir((d) => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'));
      if (sortDir === 'desc') setSortKey(null);
    }
  }

  const sorted = sortKey
    ? [...lessons].sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'child') cmp = a.child.name.localeCompare(b.child.name, 'uk');
        else if (sortKey === 'teacher') cmp = a.teacher.name.localeCompare(b.teacher.name, 'uk');
        else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
        else if (sortKey === 'startDate') cmp = a.startDate.localeCompare(b.startDate);
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : lessons;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead><SortBtn label="Учень" col="child" activeCol={sortKey} dir={sortDir} onToggle={handleSort} /></TableHead>
          <TableHead><SortBtn label="Вчитель" col="teacher" activeCol={sortKey} dir={sortDir} onToggle={handleSort} /></TableHead>
          <TableHead><SortBtn label="Статус" col="status" activeCol={sortKey} dir={sortDir} onToggle={handleSort} /></TableHead>
          <TableHead><SortBtn label="Початок" col="startDate" activeCol={sortKey} dir={sortDir} onToggle={handleSort} /></TableHead>
          <TableHead>Кінець</TableHead>
          <TableHead>Ціна</TableHead>
          <TableHead className="text-right">Дії</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((lesson) => (
          <TableRow key={lesson.id}>
            <TableCell className="font-medium">{lesson.child.name}</TableCell>
            <TableCell>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                {lesson.teacher.name}
              </span>
            </TableCell>
            <TableCell>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lesson.status]}`}>
                {STATUS_LABELS[lesson.status]}
              </span>
            </TableCell>
            <TableCell>
              <div className="flex flex-col gap-0.5">
                <span>{fmtDateTime(lesson.startDate)}</span>
                {lesson.status === 'RESCHEDULED' && lesson.originalStartDate && (
                  <span className="text-xs text-gray-400 line-through">
                    {fmtDateTime(lesson.originalStartDate)}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-col gap-0.5">
                <span>{fmtDateTime(lesson.endDate)}</span>
                {lesson.status === 'RESCHEDULED' && lesson.originalEndDate && (
                  <span className="text-xs text-gray-400 line-through">
                    {fmtDateTime(lesson.originalEndDate)}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell>{Number(lesson.price).toLocaleString('uk-UA')} грн</TableCell>
            <TableCell className="text-right space-x-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(lesson)}>
                Редагувати
              </Button>
              <Button variant="destructive" size="sm" onClick={() => onDelete(lesson)}>
                Видалити
              </Button>
            </TableCell>
          </TableRow>
        ))}
        {lessons.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-gray-400 py-8">
              Уроків не знайдено
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 3: Create delete-dialog.tsx for lessons**

Create `front/src/components/lessons/delete-dialog.tsx`:

```typescript
'use client';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeleteLesson } from '@/lib/lessons';
import type { Lesson } from '@/types/lesson';

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  lesson: Lesson | null;
}

export function DeleteDialog({ open, onClose, lesson }: DeleteDialogProps) {
  const deleteMutation = useDeleteLesson();

  async function handleDelete() {
    if (!lesson) return;
    await deleteMutation.mutateAsync(lesson.id);
    onClose();
  }

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Видалити урок?</AlertDialogTitle>
          <AlertDialogDescription>
            Урок з {lesson?.child.name} — цю дію неможливо скасувати.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Скасувати</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteMutation.isPending ? 'Видалення...' : 'Видалити'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add front/src/components/lessons/lessons-table.tsx front/src/components/lessons/delete-dialog.tsx && git commit -m "feat: add LessonsTable and DeleteDialog components"
```

---

## Task 9: Lesson Modal

**Files:**
- Create: `front/src/components/lessons/lesson-modal.tsx`

- [ ] **Step 1: Create lesson-modal.tsx**

Create `front/src/components/lessons/lesson-modal.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useCreateLesson, useUpdateLesson, usePriceSuggestion } from '@/lib/lessons';
import { useChildren } from '@/lib/children';
import { useUsers } from '@/lib/users';
import { useSessionStore } from '@/store/session.store';
import type { Lesson, LessonStatus } from '@/types/lesson';

const STATUSES: { value: LessonStatus; label: string }[] = [
  { value: 'PLANNED', label: 'Заплановано' },
  { value: 'CONDUCTED', label: 'Проведено' },
  { value: 'CANCELLED', label: 'Скасовано' },
  { value: 'RESCHEDULED', label: 'Перенесено' },
];

const schema = z.object({
  startDate: z.string().min(1, "Обов'язкове поле"),
  endDate: z.string().min(1, "Обов'язкове поле"),
  price: z.coerce.number().positive('Вкажіть ціну'),
  originalStartDate: z.string().optional(),
  originalEndDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// Converts ISO string to datetime-local input format: "YYYY-MM-DDTHH:MM"
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 16);
}

interface LessonModalProps {
  open: boolean;
  onClose: () => void;
  lesson?: Lesson;
}

export function LessonModal({ open, onClose, lesson }: LessonModalProps) {
  const isEdit = !!lesson;
  const [submitError, setSubmitError] = useState('');
  const [childId, setChildId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [status, setStatus] = useState<LessonStatus>('PLANNED');
  const [startDateVal, setStartDateVal] = useState('');

  const currentUser = useSessionStore((s) => s.user);
  const isAdmin = currentUser?.role === 'ADMIN';

  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const { data: children = [] } = useChildren();
  const { data: users = [] } = useUsers();

  // Auto-fill price suggestion
  const { data: suggestedPrice } = usePriceSuggestion(
    childId || null,
    teacherId || null,
    startDateVal ? new Date(startDateVal).toISOString() : null,
  );

  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues> });

  const currentStartDate = watch('startDate');
  // Keep startDateVal in sync for price suggestion query
  useEffect(() => { setStartDateVal(currentStartDate || ''); }, [currentStartDate]);

  // Auto-fill price when suggestion arrives and price field is empty
  useEffect(() => {
    if (suggestedPrice !== null && suggestedPrice !== undefined) {
      setValue('price', suggestedPrice);
    }
  }, [suggestedPrice]);

  useEffect(() => {
    setSubmitError('');
    if (lesson) {
      reset({
        startDate: toDatetimeLocal(lesson.startDate),
        endDate: toDatetimeLocal(lesson.endDate),
        price: Number(lesson.price),
        originalStartDate: toDatetimeLocal(lesson.originalStartDate),
        originalEndDate: toDatetimeLocal(lesson.originalEndDate),
      });
      setChildId(lesson.child.id);
      setTeacherId(lesson.teacher.id);
      setStatus(lesson.status);
    } else {
      reset({ startDate: '', endDate: '', price: undefined as never, originalStartDate: '', originalEndDate: '' });
      setChildId('');
      // For TEACHER: pre-fill their own id
      setTeacherId(isAdmin ? '' : (currentUser?.id ?? ''));
      setStatus('PLANNED');
    }
  }, [lesson, open]);

  async function onSubmit(data: FormValues) {
    if (!childId || !teacherId) {
      setSubmitError('Оберіть учня та вчителя');
      return;
    }
    try {
      const payload = {
        childId,
        teacherId,
        status,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        price: data.price,
        ...(status === 'RESCHEDULED' && data.originalStartDate
          ? { originalStartDate: new Date(data.originalStartDate).toISOString() }
          : {}),
        ...(status === 'RESCHEDULED' && data.originalEndDate
          ? { originalEndDate: new Date(data.originalEndDate).toISOString() }
          : {}),
      };
      if (isEdit) {
        await updateLesson.mutateAsync({ id: lesson.id, data: payload });
      } else {
        await createLesson.mutateAsync(payload);
      }
      onClose();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Щось пішло не так');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редагувати урок' : 'Додати урок'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Учень</Label>
              <Select value={childId} onValueChange={(v) => setChildId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue>{children.find((c) => c.id === childId)?.name ?? 'Оберіть учня'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {children.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Вчитель</Label>
              {isAdmin ? (
                <Select value={teacherId} onValueChange={(v) => setTeacherId(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue>{users.find((u) => u.id === teacherId)?.name ?? 'Оберіть вчителя'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={currentUser?.name ?? ''} disabled />
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Статус</Label>
            <Select value={status} onValueChange={(v) => setStatus((v ?? 'PLANNED') as LessonStatus)}>
              <SelectTrigger>
                <SelectValue>{STATUSES.find((s) => s.value === status)?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="lesson-start">Початок</Label>
              <Input id="lesson-start" type="datetime-local" {...register('startDate')} />
              {errors.startDate && <p className="text-sm text-red-500">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lesson-end">Кінець</Label>
              <Input id="lesson-end" type="datetime-local" {...register('endDate')} />
              {errors.endDate && <p className="text-sm text-red-500">{errors.endDate.message}</p>}
            </div>
          </div>

          {status === 'RESCHEDULED' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="space-y-1">
                <Label htmlFor="orig-start" className="text-orange-700 text-xs">Первісний початок</Label>
                <Input id="orig-start" type="datetime-local" {...register('originalStartDate')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="orig-end" className="text-orange-700 text-xs">Первісний кінець</Label>
                <Input id="orig-end" type="datetime-local" {...register('originalEndDate')} />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="lesson-price">
              Ціна (грн)
              {suggestedPrice !== null && suggestedPrice !== undefined && (
                <span className="ml-2 text-xs text-green-600">автозаповнено</span>
              )}
            </Label>
            <Input id="lesson-price" type="number" min={1} step="0.01" {...register('price')} />
            {errors.price && <p className="text-sm text-red-500">{errors.price.message}</p>}
          </div>

          {submitError && <p className="text-sm text-red-500">{submitError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Скасувати</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? 'Зберегти' : 'Створити'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add front/src/components/lessons/lesson-modal.tsx && git commit -m "feat: add LessonModal with price auto-fill, RESCHEDULED original dates"
```

---

## Task 10: Lessons Page + Sidebar Update

**Files:**
- Create: `front/src/app/(admin)/lessons/page.tsx`
- Modify: `front/src/app/(admin)/layout.tsx`

- [ ] **Step 1: Create lessons page directory**

```bash
mkdir -p "front/src/app/(admin)/lessons"
```

- [ ] **Step 2: Create lessons/page.tsx**

Create `front/src/app/(admin)/lessons/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LessonsTable } from '@/components/lessons/lessons-table';
import { LessonModal } from '@/components/lessons/lesson-modal';
import { DeleteDialog } from '@/components/lessons/delete-dialog';
import { useLessons } from '@/lib/lessons';
import type { Lesson } from '@/types/lesson';

type ModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; lesson: Lesson };

type DeleteState = { open: false } | { open: true; lesson: Lesson };

export default function LessonsPage() {
  const { data: lessons = [], isLoading, error } = useLessons();
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false });

  if (isLoading) return <p className="text-gray-500">Завантаження...</p>;
  if (error) return <p className="text-red-500">Помилка завантаження уроків</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Уроки{' '}
          <span className="text-sm font-normal text-gray-400">({lessons.length})</span>
        </h2>
        <Button onClick={() => setModal({ open: true, mode: 'create' })}>
          + Додати урок
        </Button>
      </div>

      <div className="bg-white rounded-lg border">
        <LessonsTable
          lessons={lessons}
          onEdit={(lesson) => setModal({ open: true, mode: 'edit', lesson })}
          onDelete={(lesson) => setDeleteState({ open: true, lesson })}
        />
      </div>

      <LessonModal
        open={modal.open}
        lesson={modal.open && modal.mode === 'edit' ? modal.lesson : undefined}
        onClose={() => setModal({ open: false })}
      />

      <DeleteDialog
        open={deleteState.open}
        lesson={deleteState.open ? deleteState.lesson : null}
        onClose={() => setDeleteState({ open: false })}
      />
    </div>
  );
}
```

- [ ] **Step 3: Update navItems in layout.tsx**

In `front/src/app/(admin)/layout.tsx`, update `navItems`:

```typescript
const navItems = [
  { href: '/dashboard', label: 'Дашборд' },
  { href: '/users', label: 'Користувачі' },
  { href: '/children', label: 'Діти' },
  { href: '/lessons', label: 'Уроки' },
  { href: '/lesson-prices', label: 'Вартість заняття' },
];
```

- [ ] **Step 4: TypeScript check**

```bash
cd front && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd .. && git add "front/src/app/(admin)/lessons/" "front/src/app/(admin)/layout.tsx" && git commit -m "feat: add lessons page and update sidebar navigation"
```

---

## Task 11: Dashboard Weekly Calendar Component

**Files:**
- Create: `front/src/components/dashboard/week-calendar.tsx`

- [ ] **Step 1: Create directory**

```bash
mkdir -p front/src/components/dashboard
```

- [ ] **Step 2: Create week-calendar.tsx**

Create `front/src/components/dashboard/week-calendar.tsx`:

```typescript
'use client';

import { useMemo } from 'react';
import type { Lesson, LessonStatus } from '@/types/lesson';

const HOUR_START = 8;
const HOUR_END = 22;
const ROW_PX = 60;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const TOTAL_H = (HOUR_END - HOUR_START) * ROW_PX;

const STATUS_STYLE: Record<LessonStatus, string> = {
  PLANNED: 'border-blue-400 bg-blue-50 text-blue-900',
  CONDUCTED: 'border-green-500 bg-green-50 text-green-900',
  CANCELLED: 'border-red-400 bg-red-50 text-red-900',
  RESCHEDULED: 'border-orange-400 bg-orange-50 text-orange-900',
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

function getLessonPos(lesson: Lesson): { top: number; height: number } | null {
  const s = new Date(lesson.startDate);
  const e = new Date(lesson.endDate);
  const sh = s.getHours() + s.getMinutes() / 60;
  const eh = e.getHours() + e.getMinutes() / 60;
  if (eh <= HOUR_START || sh >= HOUR_END) return null;
  const cs = Math.max(sh, HOUR_START);
  const ce = Math.min(eh, HOUR_END);
  return { top: (cs - HOUR_START) * ROW_PX, height: (ce - cs) * ROW_PX };
}

interface WeekCalendarProps {
  lessons: Lesson[];
  weekStart: Date;
}

export function WeekCalendar({ lessons, weekStart }: WeekCalendarProps) {
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
      <div className="w-14 shrink-0 border-r bg-gray-50">
        <div className="h-10 border-b" />
        <div className="relative" style={{ height: TOTAL_H }}>
          {HOURS.map((h) => (
            <div
              key={h}
              className="absolute w-full pr-2 text-right text-[11px] text-gray-400"
              style={{ top: (h - HOUR_START) * ROW_PX - 7 }}
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
            {/* Header */}
            <div className={`h-10 border-b flex flex-col items-center justify-center ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}>
              <span className="text-[11px] text-gray-500 capitalize">
                {day.toLocaleDateString('uk-UA', { weekday: 'short' })}
              </span>
              <span className={`text-sm font-semibold leading-none ${isToday ? 'text-blue-600' : ''}`}>
                {day.getDate()}
              </span>
            </div>

            {/* Grid + lessons */}
            <div className="relative" style={{ height: TOTAL_H }}>
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute w-full border-t border-gray-100"
                  style={{ top: (h - HOUR_START) * ROW_PX }}
                />
              ))}

              {dayLessons.map((lesson) => {
                const pos = getLessonPos(lesson);
                if (!pos || pos.height < 8) return null;
                return (
                  <div
                    key={lesson.id}
                    className={`absolute left-0.5 right-0.5 rounded border-l-2 px-1 py-0.5 overflow-hidden ${STATUS_STYLE[lesson.status]}`}
                    style={{ top: pos.top + 1, height: pos.height - 2 }}
                  >
                    <div className="text-[11px] font-semibold truncate leading-tight">
                      {lesson.child.name}
                    </div>
                    {pos.height >= 30 && (
                      <div className="text-[10px] opacity-70 leading-tight">
                        {new Date(lesson.startDate).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}–
                        {new Date(lesson.endDate).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
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

- [ ] **Step 3: Commit**

```bash
git add front/src/components/dashboard/week-calendar.tsx && git commit -m "feat: add WeekCalendar component"
```

---

## Task 12: Dashboard Page

**Files:**
- Create: `front/src/app/(admin)/dashboard/page.tsx`

- [ ] **Step 1: Create directory**

```bash
mkdir -p "front/src/app/(admin)/dashboard"
```

- [ ] **Step 2: Create dashboard/page.tsx**

Create `front/src/app/(admin)/dashboard/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WeekCalendar, getWeekStart } from '@/components/dashboard/week-calendar';
import { useLessons } from '@/lib/lessons';
import { useUsers } from '@/lib/users';
import { useSessionStore } from '@/store/session.store';

function toWeekStart(date: Date): string {
  return date.toLocaleDateString('en-CA'); // YYYY-MM-DD
}

function fmtWeekLabel(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const s = start.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
  const e = end.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${s} – ${e}`;
}

export default function DashboardPage() {
  const currentUser = useSessionStore((s) => s.user);
  const isAdmin = currentUser?.role === 'ADMIN';

  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  const { data: users = [] } = useUsers();

  // TEACHER uses their own id; ADMIN uses selectedTeacherId
  const teacherId = isAdmin ? selectedTeacherId : (currentUser?.id ?? '');

  const { data: lessons = [], isLoading } = useLessons({
    teacherId: teacherId || undefined,
    weekStart: toWeekStart(weekStart),
  });

  function prevWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  }

  function nextWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  }

  function goToday() {
    setWeekStart(getWeekStart(new Date()));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold">Дашборд</h2>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Select
              value={selectedTeacherId}
              onValueChange={(v) => setSelectedTeacherId(v ?? '')}
            >
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

          <Button variant="outline" size="sm" onClick={goToday}>
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

      {isLoading ? (
        <p className="text-gray-500">Завантаження...</p>
      ) : (
        <WeekCalendar lessons={lessons} weekStart={weekStart} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd front && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd .. && git add "front/src/app/(admin)/dashboard/" front/src/components/dashboard/ && git commit -m "feat: add dashboard page with weekly calendar and teacher selector"
```
