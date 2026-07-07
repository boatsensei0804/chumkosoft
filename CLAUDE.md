@AGENTS.md

> **READ FIRST:** This project runs **Next.js 16.2.10 / React 19**, which contains
> breaking changes vs. older Next.js. Before writing any Next.js code, read the
> relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices.
> The rules below are conventions; the framework docs are the source of truth for APIs.

# Project Overview

**Application name:** chumkosoft

This project uses the following technology stack:

- Next.js 16 (App Router)
- React 19
- TypeScript (Strict Mode)
- Material UI (MUI) — components
- Tailwind CSS v4 — utility layout & spacing
- Prisma ORM
- PostgreSQL
- NextAuth.js (Auth.js)
- REST API
- ESLint + Prettier

> **Current state:** The app is scaffolded and running. Installed and in use: MUI,
> Prisma (schema + migrations + seed), Tailwind v4, Zod, dnd-kit. The dashboard
> (overview, students, teachers, courses, drag-and-drop timetable, settings) is wired
> through `repositories/` → `services/` → pages/Server Actions against Postgres.
> Still check `package.json` before assuming a library exists.
>
> **Two conventions differ from the aspirational stack above — follow the code, not the
> wish list:**
> - **Auth is a custom JWT session** (`jose` + `bcryptjs`, HttpOnly cookie), not
>   NextAuth. Signing/verification lives in `lib/session.ts`; the authoritative
>   authorization check is the DAL in `lib/dal.ts`; optimistic route gating is in
>   `proxy.ts` (Next 16 renamed `middleware` → `proxy`, node runtime).
> - **Mutations use Server Actions**, not REST `/api/v1` route handlers. There is no
>   `app/api/` yet. Add REST handlers only if a real external/API consumer needs them.

Always follow the conventions in this document.

## General Principles

- Write production-ready code.
- Keep code simple and maintainable.
- Prefer readability over cleverness.
- Never generate placeholder code.
- Never leave TODO comments.
- Never disable TypeScript or ESLint.

## TypeScript

- Always use strict typing.
- Never use `any`. Use `unknown` when the type is genuinely unknown, then narrow.
- Always define function return types.
- Prefer interfaces for data models.

```ts
interface UserDto {
  id: string;
  name: string;
}
```

## Project Structure

```
app/            # App Router routes + API route handlers
components/      # Shared, cross-feature UI (see components/ui/)
features/        # Feature modules (self-contained)
lib/            # Framework/client singletons (prisma, auth, etc.)
services/        # Cross-feature business logic
repositories/    # Cross-feature data access
types/          # Shared types
utils/          # Pure helpers
prisma/         # Prisma schema
middleware.ts    # Route protection
```

**Feature-based first.** Prefer colocating code inside its feature. Promote code to
the root-level `services/` / `repositories/` **only** when it is genuinely shared by
more than one feature — do not duplicate a layer in both places.

```
features/
  auth/
  users/
  students/
  teachers/
  courses/
```

Inside each feature:

```
components/
hooks/
services/       # feature business logic
repositories/    # feature data access
schemas/        # Zod schemas
types/
```

## Next.js Rules

- Use the App Router only. Never create a `pages/` directory.
- Use Server Components by default.
- Add `"use client"` only when a component needs hooks, state, or browser APIs.
- Confirm API shapes against `node_modules/next/dist/docs/` before use (v16 changed several APIs).

## Styling: Material UI + Tailwind

Both are used together, with a clear division of responsibility:

- **Material UI** — interactive components (Button, Dialog, DataGrid, form controls),
  theming, and design tokens. Use `ThemeProvider` for global styling.
- **Tailwind CSS** — layout, spacing, flex/grid, and one-off utility styling on
  plain elements.
- **Do not** re-implement an MUI component with raw Tailwind, and **do not** override
  MUI internals with Tailwind utility classes — style MUI via the `sx` prop or theme.
- Build reusable UI in `components/ui/`.
- Avoid inline `style={{}}` objects; prefer `sx`, theme customization, or Tailwind classes.

## Prisma

- Access the database only through Prisma Client.
- Instantiate `PrismaClient` exactly once, in `lib/prisma.ts`, and export it as the
  default. Everywhere else, import that singleton:

```ts
// lib/prisma.ts — the ONLY place PrismaClient is constructed
import { PrismaClient } from "@prisma/client";

const prisma = globalThis.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

export default prisma;
```

```ts
// anywhere else
import prisma from "@/lib/prisma";
```

- Avoid raw SQL queries unless strictly necessary.

## PostgreSQL

- PostgreSQL is the primary database, accessed through the Prisma schema.
- Model IDs use Prisma string identifiers (`@id @default(cuid())`); let Prisma generate them.
- Always validate user input before database access.
- Use Prisma `select` to fetch only needed fields; never retrieve entire rows blindly.

## Authentication

Authentication uses **NextAuth.js (Auth.js)**.

Requirements:

- JWT session strategy
- Role Based Access Control (RBAC)
- Middleware protection (`middleware.ts`)
- Server-side session validation

Roles: `ADMIN`, `TEACHER`, `STUDENT`, `PARENT`.

Never trust client-supplied roles. Always validate permissions on the server.

## API Design

Follow RESTful standards. Base URL: `/api/v1/`.

```
GET    /api/v1/users
GET    /api/v1/users/{id}
POST   /api/v1/users
PUT    /api/v1/users/{id}
PATCH  /api/v1/users/{id}
DELETE /api/v1/users/{id}
```

- Always use plural resource names. Never use verbs (`/getUsers` ❌ → `/users` ✅).

### Response Format

Success:

```json
{ "success": true, "data": {}, "message": "Success" }
```

Validation error:

```json
{ "success": false, "message": "Validation failed", "errors": [] }
```

Server error:

```json
{ "success": false, "message": "Internal server error" }
```

### HTTP Status Codes

`200` OK · `201` Created · `204` No Content · `400` Bad Request · `401` Unauthorized ·
`403` Forbidden · `404` Not Found · `409` Conflict · `422` Validation Error ·
`500` Internal Server Error.

## Validation

- Validate all incoming data with **Zod** — `params`, `query`, and `body` — before processing.
- Never trust client input.

## Error Handling

- Wrap every API handler in `try/catch`.
- Never expose stack traces to clients.
- Log internal errors server-side only.
- Always return the standardized response format.

## Layered Responsibilities

- **Business logic** → `services/`
- **Database access** → `repositories/`
- **API handlers** → validate input, call services, return responses. Nothing more.

## Naming

- Files: `kebab-case.ts`
- Components: `PascalCase.tsx`
- Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Interfaces: `User`
- DTOs: `CreateUserDto`, `UpdateUserDto`, `UserResponseDto`

## Imports

Always use the `@/` alias; never use long relative paths.

```ts
import prisma from "@/lib/prisma";
```

## Async

Always use `async/await`. Never use `.then()`.

## Security

Always: validate input, sanitize data, check permissions, authenticate users, protect
sensitive routes.

Never expose passwords, secrets, or access tokens. Use environment variables only.

### Environment Variables

- Store secrets in `.env.local`.
- Never hardcode database URLs, JWT secrets, or OAuth secrets.

## Logging

- Development: `console.error()` is acceptable.
- Production: prefer structured logging.

## Performance

- Prefer Server Components.
- Use caching appropriately.
- Paginate list endpoints.
- Use Prisma `select`; never fetch unnecessary data.

## Accessibility

- Follow WCAG guidelines.
- Every image must have `alt` text.
- Buttons require accessible labels.
- Use semantic HTML.

## Preferred Libraries

| Concern         | Library              |
| --------------- | -------------------- |
| UI components   | Material UI          |
| Utility styling | Tailwind CSS         |
| ORM             | Prisma               |
| Database        | PostgreSQL           |
| Validation      | Zod                  |
| Forms           | React Hook Form      |
| Authentication  | NextAuth.js          |
| Icons           | Material Icons       |
| Date            | date-fns             |
| State           | Zustand              |
| Tables          | Material React Table |
| Charts          | MUI X Charts         |

## Code Generation Rules

When generating code:

- Follow SOLID principles and Clean Code.
- Follow REST API best practices.
- Separate Controller (route handler), Service, and Repository responsibilities.
- Generate complete code with full TypeScript types.
- Avoid duplicated logic; prefer reusable components.
- Keep functions small.
- Write scalable architecture suitable for enterprise applications.
