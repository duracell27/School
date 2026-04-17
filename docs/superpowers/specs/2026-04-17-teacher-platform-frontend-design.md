# Teacher Platform — Frontend Design

**Date:** 2026-04-17
**Scope:** Next.js frontend — Login page + Admin panel (User management)
**Status:** Approved

---

## Overview

A web-only admin panel for the Teacher Platform. Admins log in and manage users (create, edit, delete, assign roles). No self-registration — only admins create accounts.

---

## Tech Stack

- **Framework:** Next.js (App Router)
- **UI:** shadcn/ui + Tailwind CSS
- **Server state:** TanStack Query (caching, invalidation, mutations)
- **Client state:** Zustand (session user, modal open/close)
- **API:** Direct fetch to NestJS `http://localhost:3001`, `credentials: 'include'`

---

## Project Structure

```
School/front/
  src/
    app/
      (auth)/
        login/
          page.tsx
      (admin)/
        layout.tsx          ← auth guard, session bootstrap
        users/
          page.tsx
    components/
      users/
        users-table.tsx
        user-modal.tsx      ← create + edit (same component)
        delete-dialog.tsx
    lib/
      api.ts                ← fetch wrapper with credentials + 401 retry
    store/
      session.store.ts      ← Zustand: current user, modal state
    types/
      user.ts
```

---

## Auth Flow (httpOnly Cookies)

Both `access_token` and `refresh_token` are stored in httpOnly cookies — JavaScript never reads them directly.

**Login:**
1. User submits login form → POST `/auth/login`
2. NestJS sets both tokens as httpOnly cookies
3. Frontend redirects to `/users`

**Session bootstrap (admin layout):**
- On mount, layout calls GET `/auth/refresh`
- Success → stores user data in Zustand, renders children
- 401 → redirects to `/login`

**401 retry in API client:**
- Any API call returns 401 → attempt POST `/auth/refresh`
- Success → retry original request
- Refresh fails → redirect to `/login`

**Logout:**
- POST `/auth/logout` → NestJS clears both cookies → redirect to `/login`

---

## Backend Changes Required

1. **`auth.service.ts` — `issueTokens`:** additionally set `access_token` as httpOnly cookie (same `sameSite: 'strict'`, short `maxAge` matching JWT expiry)
2. **`auth/guards/jwt-auth.guard.ts`:** read token from `req.cookies['access_token']` instead of `Authorization` header
3. **`users/dto/update-user.dto.ts`:** add optional `password` field (`@IsString() @MinLength(8) @IsOptional()`)
4. **`users/users.service.ts` — `update`:** if `dto.password` is provided, hash it with bcrypt before saving
5. **`main.ts` — CORS:** enable `credentials: true`, `origin: 'http://localhost:3000'`

---

## Pages & Routing

| Route | Access | Description |
|-------|--------|-------------|
| `/login` | Public | Login form |
| `/users` | ADMIN only | User management table |

`(admin)/layout.tsx` acts as the auth guard — checks session via `/auth/refresh` on every load and redirects unauthenticated users to `/login`.

---

## User Management

### Table (`/users`)

Columns: Name, Email, Role (badge), Created At, Actions (Edit / Delete)

- Data fetched via TanStack Query, cached and refetched after mutations
- "Create user" button in page header opens Create modal

### Create Modal

Fields:
- Name (required)
- Email (required)
- Password (required, min 8 chars)
- Role (select: TEACHER / ADMIN)

On submit: POST `/users` — then invalidate users query.

> **Note:** Backend currently has no POST `/users` endpoint. This needs to be added: `UsersController` gets a `@Post()` route backed by a `create` method in `UsersService` that calls `prisma.user.create` with a hashed password.

### Edit Modal

Same form as Create, but:
- Pre-filled with user data
- Password field is empty — if left blank, password is not changed
- On submit: PATCH `/users/:id` with only changed fields

### Delete

shadcn `AlertDialog` — "Are you sure?" confirmation before DELETE `/users/:id`.

---

## State Management

**TanStack Query** handles all server state:
- `useUsers()` — fetches user list, cached
- `useCreateUser()`, `useUpdateUser()`, `useDeleteUser()` — mutations that invalidate `useUsers` on success

**Zustand** handles client state:
- Current session user (id, name, role)
- Modal state: `{ open: boolean, mode: 'create' | 'edit', user?: User }`

---

## API Client (`lib/api.ts`)

Single `apiFetch` wrapper:
- Base URL: `http://localhost:3001`
- Always `credentials: 'include'`
- On 401: attempt `/auth/refresh`, retry original request once
- On second 401 or refresh failure: redirect to `/login`

---

## Out of Scope (This Phase)

- Registration page
- Teacher-facing pages
- Classes / lessons management
- File uploads, avatars
- Pagination (simple full-list fetch for now)
