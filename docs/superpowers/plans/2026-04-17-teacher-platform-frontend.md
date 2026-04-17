# Teacher Platform Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js admin panel with login page and user management (create/edit/delete), backed by the existing NestJS API using httpOnly cookie authentication.

**Architecture:** Next.js App Router (CSR), direct fetch to NestJS at `http://localhost:3001` with `credentials: 'include'`. TanStack Query for server state, Zustand for session. Route groups: `(auth)` for public pages, `(admin)` for protected pages guarded by a client-side auth check on mount.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, react-hook-form, zod

---

## File Map

| File | Responsibility |
|------|----------------|
| `back/src/users/dto/create-user.dto.ts` | Validated admin create-user payload |
| `back/src/users/users.service.ts` | Add `create()`, update `update()` to hash optional password |
| `back/src/users/users.service.spec.ts` | Tests for create + password-update |
| `back/src/users/users.controller.ts` | Add `POST /users` route |
| `back/src/users/dto/update-user.dto.ts` | Add optional `password` field |
| `back/src/auth/auth.service.ts` | `issueTokens` sets `access_token` httpOnly cookie |
| `back/src/auth/auth.service.ts` | `logout` clears `access_token` cookie |
| `back/src/auth/guards/jwt-auth.guard.ts` | Read token from `req.cookies['access_token']` |
| `back/src/main.ts` | Enable CORS with credentials |
| `front/src/types/user.ts` | User, CreateUserPayload, UpdateUserPayload types |
| `front/src/lib/api.ts` | fetch wrapper with credentials + 401 retry |
| `front/src/lib/users.ts` | TanStack Query hooks for user CRUD |
| `front/src/store/session.store.ts` | Zustand store: current user |
| `front/src/app/providers.tsx` | QueryClientProvider wrapper |
| `front/src/app/layout.tsx` | Root layout with Providers |
| `front/src/app/(auth)/login/page.tsx` | Login form page |
| `front/src/app/(admin)/layout.tsx` | Auth guard + session bootstrap |
| `front/src/app/(admin)/users/page.tsx` | Users page: table + modal/dialog state |
| `front/src/components/users/users-table.tsx` | shadcn Table of users |
| `front/src/components/users/user-modal.tsx` | Create/Edit modal with form |
| `front/src/components/users/delete-dialog.tsx` | Delete confirmation AlertDialog |

---

### Task 1: Add `create` to UsersService (TDD)

**Files:**
- Modify: `back/src/users/users.service.spec.ts`
- Modify: `back/src/users/users.service.ts`
- Create: `back/src/users/dto/create-user.dto.ts`

- [ ] **Step 1: Add bcrypt mock and create tests to spec file**

Open `back/src/users/users.service.spec.ts`. Add `jest.mock('bcrypt', ...)` after the existing imports and add `create` describe block. Final file:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

const mockUser = {
  id: 'cuid1',
  email: 'teacher@example.com',
  name: 'John Teacher',
  role: Role.TEACHER,
  avatar: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const prismaMock = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  describe('findAll', () => {
    it('returns an array of users', async () => {
      prismaMock.user.findMany.mockResolvedValue([mockUser]);
      expect(await service.findAll()).toEqual([mockUser]);
    });
  });

  describe('findOne', () => {
    it('returns a user by id', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      expect(await service.findOne('cuid1')).toEqual(mockUser);
    });

    it('throws NotFoundException when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('hashes password and creates user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(mockUser);

      const result = await service.create({
        email: 'new@example.com',
        name: 'New User',
        password: 'password123',
        role: Role.TEACHER,
      });

      expect(bcryptMock.hash).toHaveBeenCalledWith('password123', 10);
      expect(result).toEqual(mockUser);
    });

    it('throws ConflictException when email already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      await expect(
        service.create({
          email: 'teacher@example.com',
          name: 'Dup',
          password: 'password123',
          role: Role.TEACHER,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates and returns the user', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);
      prismaMock.user.update.mockResolvedValue({ ...mockUser, name: 'New Name' });

      const result = await service.update('cuid1', { name: 'New Name' });
      expect(result.name).toBe('New Name');
    });

    it('throws ConflictException when new email belongs to another user', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, id: 'other-id' });

      await expect(
        service.update('cuid1', { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('allows updating email to the same address', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockUser);
      prismaMock.user.update.mockResolvedValue(mockUser);

      await expect(
        service.update('cuid1', { email: mockUser.email }),
      ).resolves.toBeDefined();
    });

    it('hashes password when provided in update', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);
      prismaMock.user.update.mockResolvedValue(mockUser);
      bcryptMock.hash.mockResolvedValue('new-hashed' as any);

      await service.update('cuid1', { password: 'newpassword123' });

      expect(bcryptMock.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ password: 'new-hashed' }),
        }),
      );
    });

    it('does not call hash when password is not provided', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);
      prismaMock.user.update.mockResolvedValue(mockUser);

      await service.update('cuid1', { name: 'Only Name' });

      expect(bcryptMock.hash).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.delete.mockResolvedValue(mockUser);
      await expect(service.remove('cuid1')).resolves.toBeUndefined();
    });

    it('throws NotFoundException when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
```

- [ ] **Step 2: Run tests — expect failures on `create` and password-update tests**

```bash
cd /Users/Apple/IT/School/back
npm run test -- --testPathPatterns=users.service
```

Expected: FAIL — `service.create is not a function` and `hashes password when provided`.

- [ ] **Step 3: Create `CreateUserDto`**

Create `back/src/users/dto/create-user.dto.ts`:

```typescript
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(Role)
  role: Role;

  @IsString()
  @IsOptional()
  avatar?: string;
}
```

- [ ] **Step 4: Add optional `password` to `UpdateUserDto`**

Replace the entire content of `back/src/users/dto/update-user.dto.ts`:

```typescript
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;
}
```

- [ ] **Step 5: Update `UsersService` — add `create`, update `update` to hash password**

Replace the entire content of `back/src/users/users.service.ts`:

```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatar: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({ select: userSelect });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');
    const password = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { ...dto, password },
      select: userSelect,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Email already in use');
      }
    }
    const { password, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
  }

  updateRefreshToken(id: string, refreshToken: string | null) {
    return this.prisma.user.update({
      where: { id },
      data: { refreshToken },
    });
  }
}
```

- [ ] **Step 6: Run tests — all should pass**

```bash
npm run test -- --testPathPatterns=users.service
```

Expected: All 12 tests PASS.

---

### Task 2: Add `POST /users` endpoint

**Files:**
- Modify: `back/src/users/users.controller.ts`

- [ ] **Step 1: Add `@Post()` route to `UsersController`**

Replace the entire content of `back/src/users/users.controller.ts`:

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
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.users.findAll();
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    if (role !== Role.ADMIN && userId !== id) {
      throw new ForbiddenException('Access denied');
    }
    return this.users.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    if (role !== Role.ADMIN && userId !== id) {
      throw new ForbiddenException('Access denied');
    }
    if (role !== Role.ADMIN && dto.role !== undefined) {
      throw new ForbiddenException('Cannot change your own role');
    }
    return this.users.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.users.remove(id);
  }
}
```

- [ ] **Step 2: Run all backend tests**

```bash
npm run test
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/Apple/IT/School
git add back/src/users/
git commit -m "feat: add create user endpoint and optional password update"
```

---

### Task 3: Switch to cookie-based auth

**Files:**
- Modify: `back/src/auth/auth.service.ts`
- Modify: `back/src/auth/guards/jwt-auth.guard.ts`
- Modify: `back/src/main.ts`

- [ ] **Step 1: Update `issueTokens` to set `access_token` cookie and `logout` to clear it**

Replace the entire content of `back/src/auth/auth.service.ts`:

```typescript
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto, res: Response) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const password = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { ...dto, password },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return this.issueTokens(user.id, user.role, res, user);
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.users.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const { password, refreshToken, ...safeUser } = user;
    return this.issueTokens(user.id, user.role, res, safeUser);
  }

  async logout(userId: string, res: Response) {
    await this.users.updateRefreshToken(userId, null);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return { message: 'Logged out successfully' };
  }

  async refresh(refreshToken: string, res: Response) {
    let payload: { sub: string };
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.refreshToken) throw new UnauthorizedException('Invalid refresh token');

    const valid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!valid) throw new UnauthorizedException('Invalid refresh token');

    const { password, refreshToken: _, ...safeUser } = user;
    return this.issueTokens(user.id, user.role, res, safeUser);
  }

  private async issueTokens(
    userId: string,
    role: Role,
    res: Response,
    userData: object,
  ) {
    const accessToken = this.jwt.sign(
      { sub: userId, role },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN') as any,
      },
    );

    const newRefreshToken = this.jwt.sign(
      { sub: userId },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') as any,
      },
    );

    const hashed = await bcrypt.hash(newRefreshToken, 10);
    await this.users.updateRefreshToken(userId, hashed);

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
    };

    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', newRefreshToken, {
      ...cookieOptions,
      maxAge: 14 * 24 * 60 * 60 * 1000,
    });

    return { access_token: accessToken, user: userData };
  }
}
```

- [ ] **Step 2: Update `JwtAuthGuard` to read token from cookie**

Replace the entire content of `back/src/auth/guards/jwt-auth.guard.ts`:

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.['access_token'] ?? this.extractBearer(request);
    if (!token) throw new UnauthorizedException('No token provided');

    try {
      const payload = this.jwt.verify(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      request['user'] = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractBearer(request: Request): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}
```

- [ ] **Step 3: Enable CORS with credentials in `main.ts`**

Replace the entire content of `back/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
```

- [ ] **Step 4: Run all backend tests**

```bash
cd /Users/Apple/IT/School/back
npm run test
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/Apple/IT/School
git add back/src/auth/ back/src/main.ts
git commit -m "feat: cookie-based auth — access_token in httpOnly cookie, CORS enabled"
```

---

### Task 4: Initialize Next.js project

**Files:**
- Create: `front/` (entire project)

- [ ] **Step 1: Create Next.js project**

Run from `/Users/Apple/IT/School`:

```bash
npx create-next-app@latest front \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --no-import-alias \
  --skip-install
cd front && npm install
```

- [ ] **Step 2: Install additional dependencies**

```bash
npm install @tanstack/react-query zustand react-hook-form zod @hookform/resolvers
npm install -D @tanstack/react-query-devtools
```

- [ ] **Step 3: Initialize shadcn**

```bash
npx shadcn@latest init --defaults
```

When prompted, choose: New York style, Zinc color, CSS variables.

- [ ] **Step 4: Install shadcn components**

```bash
npx shadcn@latest add button input label form dialog alert-dialog table badge select
```

- [ ] **Step 5: Commit**

```bash
cd /Users/Apple/IT/School
git add front/
git commit -m "chore: initialize Next.js frontend with shadcn, TanStack Query, Zustand"
```

---

### Task 5: Types and API client

**Files:**
- Create: `front/src/types/user.ts`
- Create: `front/src/lib/api.ts`
- Create: `front/src/lib/users.ts`

- [ ] **Step 1: Create user types**

Create `front/src/types/user.ts`:

```typescript
export type Role = 'ADMIN' | 'TEACHER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  password: string;
  role: Role;
  avatar?: string;
}

export interface UpdateUserPayload {
  email?: string;
  name?: string;
  password?: string;
  role?: Role;
  avatar?: string;
}
```

- [ ] **Step 2: Create API fetch wrapper**

Create `front/src/lib/api.ts`:

```typescript
const BASE_URL = 'http://localhost:3001';

async function doFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}

export async function apiFetch<T = void>(path: string, options?: RequestInit): Promise<T> {
  let res = await doFetch(path, options);

  if (res.status === 401) {
    const refreshRes = await doFetch('/auth/refresh', { method: 'POST' });
    if (!refreshRes.ok) {
      window.location.href = '/login';
      throw new Error('Session expired');
    }
    res = await doFetch(path, options);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
```

- [ ] **Step 3: Create TanStack Query hooks**

Create `front/src/lib/users.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';
import type { User, CreateUserPayload, UpdateUserPayload } from '@/types/user';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch<User[]>('/users'),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserPayload) =>
      apiFetch<User>('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserPayload }) =>
      apiFetch<User>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/Apple/IT/School
git add front/src/types/ front/src/lib/
git commit -m "feat: add user types, API fetch wrapper, and TanStack Query hooks"
```

---

### Task 6: Zustand store and providers

**Files:**
- Create: `front/src/store/session.store.ts`
- Create: `front/src/app/providers.tsx`
- Modify: `front/src/app/layout.tsx`

- [ ] **Step 1: Create Zustand session store**

Create `front/src/store/session.store.ts`:

```typescript
import { create } from 'zustand';
import type { User } from '@/types/user';

interface SessionStore {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
```

- [ ] **Step 2: Create Providers component**

Create `front/src/app/providers.tsx`:

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000 },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

- [ ] **Step 3: Update root layout to use Providers**

Replace the entire content of `front/src/app/layout.tsx`:

```typescript
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Teacher Platform',
  description: 'Admin panel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/Apple/IT/School
git add front/src/store/ front/src/app/providers.tsx front/src/app/layout.tsx
git commit -m "feat: add Zustand session store and QueryClient provider"
```

---

### Task 7: Login page

**Files:**
- Create: `front/src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Create login page**

Create `front/src/app/(auth)/login/page.tsx`:

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    setError('');
    const res = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      window.location.href = '/users';
    } else {
      setError('Invalid email or password');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Logging in...' : 'Log In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

Note: Run `npx shadcn@latest add card` if `Card` component is missing.

- [ ] **Step 2: Add redirect from root `/` to `/users`**

Create `front/src/app/page.tsx` (replace generated content):

```typescript
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/users');
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/Apple/IT/School
git add front/src/app/
git commit -m "feat: add login page with form validation"
```

---

### Task 8: Admin layout with auth guard

**Files:**
- Create: `front/src/app/(admin)/layout.tsx`

- [ ] **Step 1: Create admin layout**

Create `front/src/app/(admin)/layout.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useSessionStore } from '@/store/session.store';
import type { User } from '@/types/user';

interface RefreshResponse {
  access_token: string;
  user: User;
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
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Teacher Platform — Admin</h1>
        <button
          onClick={async () => {
            await apiFetch('/auth/logout', { method: 'POST' });
            router.replace('/login');
          }}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Log out
        </button>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/Apple/IT/School
git add front/src/app/\(admin\)/
git commit -m "feat: add admin layout with auth guard and session bootstrap"
```

---

### Task 9: Users table component

**Files:**
- Create: `front/src/components/users/users-table.tsx`

- [ ] **Step 1: Create users table component**

Create `front/src/components/users/users-table.tsx`:

```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { User } from '@/types/user';

interface UsersTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

export function UsersTable({ users, onEdit, onDelete }: UsersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                {user.role}
              </Badge>
            </TableCell>
            <TableCell>
              {new Date(user.createdAt).toLocaleDateString('uk-UA')}
            </TableCell>
            <TableCell className="text-right space-x-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(user)}>
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(user)}
              >
                Delete
              </Button>
            </TableCell>
          </TableRow>
        ))}
        {users.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-gray-400 py-8">
              No users found
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
cd /Users/Apple/IT/School
git add front/src/components/
git commit -m "feat: add UsersTable component"
```

---

### Task 10: User modal (create/edit)

**Files:**
- Create: `front/src/components/users/user-modal.tsx`

- [ ] **Step 1: Create user modal component**

Create `front/src/components/users/user-modal.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { useCreateUser, useUpdateUser } from '@/lib/users';
import type { User } from '@/types/user';

const createSchema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
  role: z.enum(['ADMIN', 'TEACHER']),
});

const editSchema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  password: z.union([z.string().min(8, 'Minimum 8 characters'), z.literal('')]),
  role: z.enum(['ADMIN', 'TEACHER']),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  user?: User;
}

export function UserModal({ open, onClose, user }: UserModalProps) {
  const isEdit = !!user;
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm | EditForm>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: { name: '', email: '', password: '', role: 'TEACHER' },
  });

  useEffect(() => {
    if (user) {
      reset({ name: user.name, email: user.email, password: '', role: user.role });
    } else {
      reset({ name: '', email: '', password: '', role: 'TEACHER' });
    }
  }, [user, open]);

  async function onSubmit(data: CreateForm | EditForm) {
    try {
      if (isEdit) {
        const payload: Record<string, string> = {
          name: data.name,
          email: data.email,
          role: data.role,
        };
        if (data.password) payload.password = data.password;
        await updateUser.mutateAsync({ id: user.id, data: payload });
      } else {
        await createUser.mutateAsync(data as CreateForm);
      }
      onClose();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit User' : 'Create User'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">
              Password {isEdit && <span className="text-gray-400">(leave blank to keep current)</span>}
            </Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Role</Label>
            <Select
              value={watch('role')}
              onValueChange={(v) => setValue('role', v as 'ADMIN' | 'TEACHER')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TEACHER">Teacher</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? 'Save' : 'Create'}
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
cd /Users/Apple/IT/School
git add front/src/components/users/user-modal.tsx
git commit -m "feat: add UserModal component for create and edit"
```

---

### Task 11: Delete dialog and users page

**Files:**
- Create: `front/src/components/users/delete-dialog.tsx`
- Create: `front/src/app/(admin)/users/page.tsx`

- [ ] **Step 1: Create delete confirmation dialog**

Create `front/src/components/users/delete-dialog.tsx`:

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
import { useDeleteUser } from '@/lib/users';
import type { User } from '@/types/user';

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

export function DeleteDialog({ open, onClose, user }: DeleteDialogProps) {
  const deleteUser = useDeleteUser();

  async function handleDelete() {
    if (!user) return;
    await deleteUser.mutateAsync(user.id);
    onClose();
  }

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {user?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The user will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 2: Create users page**

Create `front/src/app/(admin)/users/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UsersTable } from '@/components/users/users-table';
import { UserModal } from '@/components/users/user-modal';
import { DeleteDialog } from '@/components/users/delete-dialog';
import { useUsers } from '@/lib/users';
import type { User } from '@/types/user';

type ModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; user: User };

type DeleteState = { open: false } | { open: true; user: User };

export default function UsersPage() {
  const { data: users = [], isLoading, error } = useUsers();
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false });

  if (isLoading) return <p className="text-gray-500">Loading users...</p>;
  if (error) return <p className="text-red-500">Failed to load users</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Users</h2>
        <Button onClick={() => setModal({ open: true, mode: 'create' })}>
          + Create user
        </Button>
      </div>

      <div className="bg-white rounded-lg border">
        <UsersTable
          users={users}
          onEdit={(user) => setModal({ open: true, mode: 'edit', user })}
          onDelete={(user) => setDeleteState({ open: true, user })}
        />
      </div>

      <UserModal
        open={modal.open}
        user={modal.open && modal.mode === 'edit' ? modal.user : undefined}
        onClose={() => setModal({ open: false })}
      />

      <DeleteDialog
        open={deleteState.open}
        user={deleteState.open ? deleteState.user : null}
        onClose={() => setDeleteState({ open: false })}
      />
    </div>
  );
}
```

- [ ] **Step 3: Build to verify no TypeScript errors**

```bash
cd /Users/Apple/IT/School/front
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/Apple/IT/School
git add front/src/
git commit -m "feat: complete admin users page with table, create/edit modal, delete dialog"
```

---

### Task 12: Smoke test

- [ ] **Step 1: Start the backend**

```bash
cd /Users/Apple/IT/School/back
npm run start:dev
```

Expected: `Nest application successfully started` on port 3001.

- [ ] **Step 2: Start the frontend**

```bash
cd /Users/Apple/IT/School/front
npm run dev
```

Expected: Next.js running on `http://localhost:3000`.

- [ ] **Step 3: Test login flow**

Open `http://localhost:3000` in a browser — should redirect to `/users`, which redirects to `/login` (not authenticated).

Enter credentials of an existing ADMIN user. Should redirect to `/users` and display the users table.

- [ ] **Step 4: Test create user**

Click "+ Create user". Fill in name, email, password, role. Submit. User should appear in the table.

- [ ] **Step 5: Test edit user**

Click "Edit" on a user. Modal should open pre-filled. Change the name. Leave password blank. Submit. User name should update in the table, password unchanged.

- [ ] **Step 6: Test password reset**

Click "Edit". Enter a new password (8+ chars). Submit. Log in as that user in a different browser/incognito with the new password — should succeed.

- [ ] **Step 7: Test delete user**

Click "Delete". Confirm in the dialog. User should disappear from the table.

- [ ] **Step 8: Test logout**

Click "Log out". Should redirect to `/login`. Navigating to `/users` should redirect back to `/login`.

- [ ] **Step 9: Final commit**

```bash
cd /Users/Apple/IT/School
git add -A
git commit -m "feat: complete teacher platform frontend v1 — login + admin user management"
```
