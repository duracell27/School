# Teacher Platform — Backend Design

**Date:** 2026-04-16  
**Scope:** NestJS backend, User entity CRUD + Auth  
**Status:** Approved

---

## Overview

A platform for teachers to manage classes and lessons. This document covers the first milestone: backend API with user management and secure authentication.

---

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** NestJS
- **ORM:** Prisma
- **Database:** PostgreSQL via Supabase
- **Auth:** `@nestjs/jwt` (pure JWT, no Passport.js)
- **Password hashing:** bcrypt
- **Cookies:** cookie-parser (httpOnly for refresh token)

---

## Project Structure

```
School/
  back/
    src/
      auth/
        auth.controller.ts
        auth.service.ts
        auth.module.ts
        guards/
          jwt-auth.guard.ts
          roles.guard.ts
        decorators/
          roles.decorator.ts
          current-user.decorator.ts
      users/
        users.controller.ts
        users.service.ts
        users.module.ts
        dto/
          create-user.dto.ts
          update-user.dto.ts
      prisma/
        prisma.service.ts
        prisma.module.ts
      app.module.ts
      main.ts
    prisma/
      schema.prisma
    .env
  front/   # (future)
```

---

## Prisma Schema

```prisma
enum Role {
  ADMIN
  TEACHER
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  password     String
  role         Role     @default(TEACHER)
  avatar       String?
  refreshToken String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

---

## Auth Design

### Tokens

| Token | TTL | Transport | Storage |
|-------|-----|-----------|---------|
| `access_token` | 15 minutes | `Authorization: Bearer` header | Client memory |
| `refresh_token` | 14 days | httpOnly cookie | Hashed in DB (`refreshToken` field) |

### Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/auth/register` | Register new user, returns tokens | Public |
| POST | `/auth/login` | Login, returns tokens | Public |
| POST | `/auth/logout` | Clears refresh token from DB and cookie | JWT required |
| POST | `/auth/refresh` | Issues new access token using httpOnly cookie | Cookie required |

### Register flow
1. Validate email uniqueness
2. Hash password with bcrypt (rounds: 10)
3. Create user in DB
4. Generate access + refresh tokens
5. Hash refresh token, save to DB
6. Set refresh token in httpOnly cookie
7. Return access token + user data

### Login flow
1. Find user by email
2. Compare password with bcrypt
3. Generate access + refresh tokens
4. Hash refresh token, save to DB
5. Set refresh token in httpOnly cookie
6. Return access token + user data

### Refresh flow
1. Read refresh token from httpOnly cookie
2. Verify JWT signature
3. Find user by id from token payload
4. Compare token with hashed value in DB
5. Issue new access token (and rotate refresh token)
6. Return new access token

### Logout flow
1. Verify access token
2. Clear `refreshToken` field in DB
3. Clear cookie

---

## User CRUD Design

### Endpoints

| Method | Path | Description | Access |
|--------|------|-------------|--------|
| GET | `/users` | List all users | ADMIN only |
| GET | `/users/:id` | Get user by id | ADMIN or own profile |
| PATCH | `/users/:id` | Update user | ADMIN or own profile |
| DELETE | `/users/:id` | Delete user | ADMIN only |

### DTOs

**UpdateUserDto** (all optional):
- `name?: string`
- `email?: string`
- `avatar?: string`
- `role?: Role` (ADMIN only)

### Guards

- `JwtAuthGuard` — validates access token from `Authorization: Bearer` header
- `RolesGuard` — checks `@Roles()` decorator against user role from JWT payload

---

## Security Considerations

- Passwords never returned in API responses (exclude `password` and `refreshToken` from all responses)
- Refresh token stored as bcrypt hash in DB
- httpOnly cookie prevents XSS access to refresh token
- Role-based access control on sensitive endpoints
- Input validation via `class-validator` on all DTOs

---

## Environment Variables

```env
DATABASE_URL=           # Supabase PostgreSQL connection string
JWT_ACCESS_SECRET=      # Secret for access token signing
JWT_REFRESH_SECRET=     # Secret for refresh token signing
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=14d
PORT=5000
```
