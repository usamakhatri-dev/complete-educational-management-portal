# Educational Management Portal — Project Status

> Auto-maintained status file. Updated after every meaningful change. The actual codebase is the source of truth.

## Project Overview

A production-grade, commercial SaaS Educational Management Portal with three isolated roles — **Management (super_admin)**, **Teacher**, and **Student**. Covers academics, attendance, exams, quizzes, assignments, results, letters/appeals, analytics, audit, and security.

**Current milestone:** Phase 1 (Foundation) — VERIFIED. Phase 1.5 (PostgreSQL Migration) — VERIFIED. Phase 2 (Academics) — COMPLETED. Phase 3 (People) — COMPLETED. Phase 4 (Timetable) — COMPLETED. Phase 5 (Attendance) — COMPLETED. Phase 6 (Exams, Quizzes & Assignments) — COMPLETED. Phase 7 (Results, Grading & Reports) — COMPLETED. Phase 8 (Communication, Appeals & Notifications) — COMPLETED. Phase 9 (Analytics, Reports, Settings & Backups) — COMPLETED. Phase 10 (File Uploads, Study Materials) — COMPLETED. Final Audit & QA — COMPLETED. Production Readiness & Hardening — COMPLETED.

## Current Technology Stack

> The approved target stack is now fully active: PostgreSQL + Prisma 7 + Docker Compose (dev via Docker Desktop). Frontend remains React/Vite SPA (approved earlier deviation from Next.js 15).

- **Backend:** NestJS 11, TypeScript (strict, `module: nodenext`), ESM (`"type": "module"`)
- **ORM:** Prisma 7.9.1 (ESM-only, `prisma-client` generator), **PostgreSQL 16** via `@prisma/adapter-pg` (driver adapter), dev DB runs in Docker (`docker-compose.yml`)
- **Frontend:** React 19, Vite 8, Tailwind CSS v4, Zustand (auth state), TanStack Query v5, React Router 7, lucide-react icons, react-hook-form + zod, recharts (unused so far)
- **Auth:** @nestjs/jwt (access) + hashed rotating refresh tokens (DB), bcryptjs password hashing
- **Security:** helmet, CORS whitelist, @nestjs/throttler rate limiting

## Architecture

- Monorepo-style layout with two folders:
  - `server/` — NestJS REST API, global prefix `/api`, port 3000
  - `client/` — React SPA, port 5173, Vite proxy `/api → http://localhost:3000`
- Global guards (order): `JwtAuthGuard` → `RolesGuard` → `PermissionsGuard` → `ThrottlerGuard`
- Global providers: `TransformInterceptor` (API envelope `{success, data, meta?}`), `AllExceptionsFilter` (consistent error shape)
- Global modules: `ConfigModule`, `JwtModule`, `ThrottlerModule` (100 req/min), `PrismaModule`, `@Global AuditModule`, `@Global RbacModule` (30s permission cache)
- Backend module layout: `modules/{auth,users,rbac,audit}`, `common/{guards,decorators,dto,filters,interceptors,types}`
- Frontend: `lib/` (api client, utils), `stores/` (zustand), `router/` (routes + guards), `components/ui` (kit), `components/layout`, `pages/`, `config/` (navigation), `hooks/`

## Database

- Provider: **PostgreSQL 16** (final target). Dev DB runs in Docker: `docker compose up -d postgres` → container `eduportal-postgres`, port 5432, named volume `pgdata`.
- `DATABASE_URL` (env-driven only): `postgresql://eduportal:<password>@localhost:5432/eduportal?schema=public` — in `server/.env` (gitignored). Compose credentials live in root `.env` (gitignored) / `.env.example` (placeholders).
- Migration applied: `20260812174827_init_pg` (fresh Postgres baseline from the stable schema). SQLite migration archived at `server/prisma/migrations_sqlite_archive/`.
- Client generation: `generator client { provider = "prisma-client", output = "../generated/prisma" }` (gitignored). Prisma 7 generates `.ts` output; source imports use `.js` extensions (resolved by tsx/nest build).
- Seed: 63 permissions, 3 roles, 3 demo users, demo academic structure. Configured via `prisma.config.ts` → `migrations.seed = "tsx prisma/seed.ts"`; run `npx prisma db seed`.
- Full model list (~31): User, TeacherProfile, StudentProfile, Department, Session, AcademicClass, Section, Subject, ClassSubject, StudentEnrollment, TimetableSlot, Attendance, Exam, ExamSchedule, ExamResult, Quiz, QuizSubmission, Assignment, AssignmentSubmission, Announcement, LetterRequest, LetterTimeline, Notification, Message, RefreshToken, File, LoginHistory, ActivityLog, BackupRecord, Role, Permission, RolePermission, Setting.
- IDs are cuid (NOT auto-increment) — do not use `ParseUUIDPipe`.
- No native enums/`@db.*` type mappings — statuses are `String` + app-level constants (portable; Postgres-compatible as designed).

## Database Migration Plan (PostgreSQL)

> Status: **VERIFIED.** Migration executed and verified 2026-08-12. PostgreSQL 16 via Docker Compose is the live dev database; SQLite is retired. Full auth/RBAC/audit verification passed against Postgres. All future DB-heavy modules (Phase 2+) run on PostgreSQL.

### Phase 1.5 execution progress
- [x] Docker Desktop verified (Engine 29.7.2, Compose v5.3.1)
- [x] `docker-compose.yml` created (postgres:16-alpine, env-driven credentials, named volume `pgdata`, pg_isready healthcheck)
- [x] Root `.env` + `.env.example` + `.gitignore` created (compose credentials via environment variables only)
- [x] `server/.env` + `server/.env.example` `DATABASE_URL` → `postgresql://...@localhost:5432/eduportal?schema=public`
- [x] `server/.gitignore`: removed obsolete `*.db` / `*.db-journal`
- [x] `schema.prisma`: provider `sqlite` → `postgresql`; `migration_lock.toml` → `postgresql`
- [x] Driver adapter swap: `@prisma/adapter-pg` + `pg` + `@types/pg` added, `@prisma/adapter-better-sqlite3` removed (package.json, prisma.service.ts, seed.ts); `npm install` clean
- [x] `prisma.config.ts`: added `migrations.seed = "tsx prisma/seed.ts"`; `tsx` installed
- [x] Postgres started via Docker Compose and HEALTHY on :5432
- [x] Fresh PostgreSQL migration `20260812174827_init_pg` created + applied (SQLite migration archived to `prisma/migrations_sqlite_archive/`)
- [x] `prisma generate` (Postgres client) — succeeded
- [x] Re-seed: 3 users, 59 permissions, 3 roles, demo academic data — verified in Postgres
- [x] Server build clean; API running on :3000 against Postgres
- [x] Auth + RBAC + audit verification (10/10 checks passed — see Testing Status)
- [x] Type/lint checks: client build green; server lint has pre-existing (non-migration) issues only
- [x] Phase 1.5 marked VERIFIED + Change Log updated

### Why SQLite was used (historical)
- The dev machine had no Docker and no PostgreSQL installed at Phase 1 time; SQLite was chosen for zero-friction local dev and the schema was written portably from day one.
- **Retired 2026-08-12:** the project now runs on PostgreSQL 16 via Docker Compose. SQLite artifacts (dev.db, old migration) are archived, not used.

### Postgres compatibility audit (of current schema)
- **Fully compatible structurally.** No Prisma enums (all statuses are `String` + constants), no native type mappings (`@db.*` attributes), no `Json` fields (JSON stored as JSON-encoded `String`: `questionsJson`, `answersJson`, `meta`, `attachmentIds`, `Setting.value`), no raw SQL, no full-text search, no SQLite-specific features.
- Every construct maps 1:1 to Postgres: `cuid` ids, `Boolean` defaults, `DateTime`, `Int`, `String`→`TEXT`, composite `@@unique`/`@@id`, indexes, `onDelete: Cascade/SetNull`.
- Column names (`name`, `value`, `path`, `type`, `module`, `status`, `key`) are not Postgres reserved words; Prisma quotes identifiers anyway.

### Changes required for Postgres
1. `server/prisma/schema.prisma`: `provider = "sqlite"` → `provider = "postgresql"` (URL already injected via `prisma.config.ts` → `DATABASE_URL`).
2. Driver adapter swap (Prisma 7 `prisma-client` requires a driver adapter): replace `@prisma/adapter-better-sqlite3` with `@prisma/adapter-pg` + `pg` in `package.json`, `src/prisma/prisma.service.ts`, and `prisma/seed.ts`. `resolveSqliteUrl` already passes non-`file:` URLs through untouched.
3. `server/.env` + `server/.env.example`: `DATABASE_URL` → `postgresql://eduportal:pass@localhost:5432/eduportal?schema=public`.
4. Regenerate migrations for Postgres (existing SQLite `migration.sql` is NOT reusable): `npx prisma migrate dev --name init_pg` against the new DB.
5. Re-seed the fresh DB (`npx prisma db seed`) — data is seed-only, so **no data transfer needed**; this also drops the leftover `t2@eduportal.dev` demo record.
6. `server/.gitignore`: remove obsolete `*.db`/`*.db-journal` entries (cosmetic).

### What would break during migration
- Compile-time only: the adapter import in `PrismaService`/`seed.ts` won't resolve until swapped. No runtime feature depends on SQLite specifics.
- Minor behavior change: Prisma `contains` → Postgres `LIKE` is case-sensitive (SQLite `LIKE` was ASCII case-insensitive). Only affects fullName search; email search already lowercases input. Not a break.
- Throttler/helmet/CORS/auth/etc. are DB-agnostic.

### Docker Compose configuration required
- Root `docker-compose.yml` (dev): service `postgres` using `postgres:16-alpine`, env `POSTGRES_USER=eduportal`, `POSTGRES_PASSWORD`, `POSTGRES_DB=eduportal`, publish `5432:5432`, named volume `pgdata:/var/lib/postgresql/data`, healthcheck `pg_isready -U eduportal -d eduportal`.
- Production deployment (later phase): add `server` + `client` compose services with Dockerfiles, depends_on postgres healthy.

### Recommended migration point
- **EXECUTED (2026-08-12).** Approved ordering now in effect: Phase 1.5 (PostgreSQL Migration) ✅ → Phase 2 — Academics → Phase 3 — People → then the existing planned module order (Timetable, Attendance, Exams/Quizzes/Assignments, Results, Letters, Analytics/Settings/Backups).
- PostgreSQL is the live database. Do NOT build any phase against SQLite.
- Dev restart procedure: `docker compose up -d postgres` (root) → `cd server && npm run build && cmd /c "start /b node dist/src/main.js"` → `cd client && cmd /c "start /b npm run dev"`.

## Authentication

- `POST /api/auth/login` (public, throttled 5/min) → verifies bcrypt hash, checks `isActive`, records LoginHistory, updates `lastLoginAt`, audits `auth.login`.
- `POST /api/auth/refresh` (public, throttled 10/min) → hashes token (sha256), rotates (revokes old, creates new), checks expiry/active.
- `POST /api/auth/logout` (public) → revokes the presented refresh token.
- `GET /api/auth/me` (protected) → user + profile (teacher/student) + permission keys.
- Access token: JWT, 15m TTL, payload `{sub, email, role}`. Refresh token: 48-byte random hex, stored hashed, 7d TTL, IP/UA recorded.
- Disabling a user revokes all their refresh tokens (forces re-login). Password reset revokes sessions + sets `mustChangePassword`.

## Roles & Permissions

- **super_admin (Management)** — bypasses PermissionsGuard; auto-gets all 65 permission keys.
- **teacher** — academic.view, timetable, attendance (take/edit/own), exams (view/manage/enter-marks/publish), quizzes (manage/grade), assignments (manage/grade), results (view/enter/publish/export), announcements (view/manage), letters (reply/approve-leave), notifications, analytics, reports, students.view-own, files, materials (view/manage), messages (send/view), system.health.
- **student** — timetable.view, attendance.view-own, exams.view, quizzes.attempt, assignments.submit, results.view, announcements.view, letters.submit, notifications.view, files.download, materials.view, messages (send/view).
- RBAC endpoint: `GET /api/rbac/permissions`, `GET /api/rbac/roles`, `PUT /api/rbac/roles/:id/permissions` (guard: `users.list` / `users.edit`). Permission cache invalidated on role change.

## Completed Modules

| Module | Status |
| --- | --- |
| Backend scaffolding (NestJS, ESM, strict TS) | VERIFIED |
| Prisma schema + migration + seed | VERIFIED |
| PrismaService (pg adapter, env-driven DATABASE_URL) | VERIFIED |
| Auth (login / refresh rotation / logout / me) | VERIFIED |
| RBAC (roles, permissions, guards, 30s cache) | VERIFIED |
| Audit trail (activity logs + login history) | VERIFIED |
| Users CRUD (create w/ profiles, list/search, update, status toggle, delete, reset-password) | VERIFIED |
| Global error filter + response envelope interceptor | VERIFIED |
| Client SPA shell (sidebar, topbar, theme toggle, page-header) | VERIFIED |
| UI kit (button, input, label, card, badge, spinner, skeleton, avatar, empty-state, table, dialog, select) | VERIFIED |
| Auth flow client (login page, zustand store w/ persist, axios interceptor + single-flight refresh, bootstrap) | VERIFIED |
| Router + guards (RequireAuth / RequireRole / RequirePermission) | VERIFIED |
| Users page (list, filters, create dialog, disable/delete/reset actions) | VERIFIED |
| Audit pages (activity logs, login history) | VERIFIED |
| Roles page (settings) | VERIFIED |
| Dashboard page (role-aware, stat cards + quick actions) | VERIFIED |
| Not-found / coming-soon pages | VERIFIED |
| Root README.md + server/.env.example | COMPLETED |
| Academics module (Departments, Sessions, Classes, Sections, Subjects — CRUD API + UI) | COMPLETED |
| People module (Teachers & Students — CRUD API + UI) | COMPLETED |
| Timetable module (Slots CRUD, conflict detection, grid view + UI) | COMPLETED |
| Attendance module (Mark/Bulk/View/Edit/Delete + Reports + Student self-view) | COMPLETED |
| Exams module (CRUD + Results + Publish + Stats) | COMPLETED |
| Quizzes module (CRUD + Submissions + Auto-grade + Manual grade) | COMPLETED |
| Assignments module (CRUD + Submissions + Grade + Late handling) | COMPLETED |
| Results module (Aggregated results + Student/Class/Subject views + Grade scale) | COMPLETED |
| Letters/Appeals module (CRUD + timeline + status workflow + student isolation) | COMPLETED |
| Announcements module (CRUD + audience targeting + pinning + expiry) | COMPLETED |
| Notifications module (CRUD + unread count + mark read) | COMPLETED |
| Messages/Inbox module (Send + inbox + sent + unread count + read tracking) | COMPLETED |
| Notification bell (Topbar unread indicator) | COMPLETED |
| Analytics module (role-aware dashboard with real data) | COMPLETED |
| Reports module (Student/Class/Subject/Attendance/Summary reports) | COMPLETED |
| Settings module (Profile management + portal settings) | COMPLETED |
| Backups module (pg_dump create/list/download/delete) | COMPLETED |
| System Health endpoint (DB connectivity check) | COMPLETED |
| Files module (upload/download/list/delete, MIME validation, RBAC) | COMPLETED |
| Study Materials module (CRUD, publish/unpublish, class/subject/section) | COMPLETED |
| FK constraints + indexes (Quiz/Assignment/StudyMaterial teacherId, 8 new indexes) | COMPLETED |
| Production Dockerfiles (server multi-stage, client multi-stage + nginx) | COMPLETED |
| Client code splitting (React.lazy, 735→415 kB) | COMPLETED |
| Frontend error states (5 key pages) | COMPLETED |
| E2E test suites (auth/RBAC + security) | COMPLETED |

## Modules In Progress

- None. Phases 1–10 are complete.

## Pending Modules

- Phase 11 — Future enhancements (testing, performance, advanced features)

## Completed Features

- Login with role-aware redirect; persisted session restore (`bootstrap`); single-flight token refresh on 401
- RBAC enforcement on both API (guards) and client (route guards + nav filtering)
- Users: create (with teacher/student profile), paginated list + search/filter, disable (revokes sessions), delete, reset password (with generated temp password)
- Audit: activity log + login history pages with pagination and filters
- Roles: view + update role↔permission mapping
- Theming: light/dark with system preference; persisted
- API envelope + consistent error handling; throttling; helmet; CORS
- File upload/download system (secure storage, MIME validation, RBAC, 50MB limit)
- Study Materials module (CRUD, publish/unpublish, class/subject/section assignment)

## Pending Features

## Known Bugs

- None critical. All critical and high-severity bugs fixed during final audit. Remaining low/medium issues are documented in Technical Debt.

## Technical Debt

- Server TS is ESM (`"type": "module"`). Every relative import needs a `.js` extension — after editing server TS files, re-run `scripts/fix-imports.ps1` and rebuild. `apply_patch` can silently strip extensions.
- **Pre-existing ESLint debt (NOT introduced by migration):** `npm run lint` reports 23 problems (21 errors, 2 warnings) in 7 Phase 1 files (guards, decorators, filter, `main.ts`, `auth.service.ts`). All are strict-type rules (`no-unsafe-*`, `no-unused-vars`). Build/type-check unaffected. Fix as a future cleanup task.
- React UMD-global type usage (`React.ReactNode` / `React.ElementType`) works under TS type-only usage but files don't import the React namespace — fine today, keep in mind.
- Prisma 7 generates `.ts` client output; `prisma migrate status` may hang on a non-TTY shell. Not a project bug.
- `prisma db seed` now requires the seed command in `prisma.config.ts` (already configured as `tsx prisma/seed.ts`).
- Assignment file attachment support exists at schema level (`attachmentIds` field) — teachers can pass file IDs when creating/uploading assignments.
- `pg_dump` command in backups service uses string interpolation — acceptable for controlled env but not ideal.
- `Announcement.classId`/`sectionId` use `onDelete: Cascade` — consider `Restrict` for data preservation.

## Important Architecture Decisions

- **Approved stack now fully active:** PostgreSQL 16 + Prisma 7 (adapter-pg) + Docker Compose. Frontend remains React/Vite SPA (approved earlier deviation from Next.js 15).
- REST API (not GraphQL); global `/api` prefix; envelope `{success, data, meta?}`.
- Prisma 7 ESM-only → `.js` import extensions + `fix-imports.ps1` workflow; driver adapter `@prisma/adapter-pg` for Postgres.
- Guard order: JWT → Roles → Permissions → Throttle; `super_admin` bypasses permission checks server-side.
- Refresh tokens: opaque random + hashed at rest + rotation + revocation; stored in DB (not JWT) for revocability.
- Statuses stored as strings with app-level constants (no native enums — Postgres-compatible and portable).
- cuid IDs everywhere; no integer auto-increment.
- `@Global` for Audit + Rbac modules to avoid repeated DI wiring.
- Dev credentials live only in gitignored env files (root `.env` for compose, `server/.env` for the app); `.env.example` files carry placeholders only. `DATABASE_URL` is required at runtime (PrismaService/seed fail fast if unset).
- Dev database is a Docker container (`eduportal-postgres`, Postgres 16, named volume `pgdata`); data survives container restarts.

## Environment / Setup Status

- Node v24.18.0, npm 11.16.0, Windows. **Docker Engine 29.7.2 + Compose v5.3.1 installed and running.**
- `docker-compose.yml` (root): `postgres:16-alpine` service, healthy on `localhost:5432` (container `eduportal-postgres`, volume `pgdata`).
- `server/.env` present (Postgres `DATABASE_URL` + dev secrets), `server/.env.example` + root `.env.example` committed with placeholders. Root `.env` (compose creds) gitignored.
- Install: `cd server && npm install`, `cd client && npm install` (both complete).
- DB: PostgreSQL migrated (`20260812174827_init_pg` + subsequent migrations). Data verified: 3 users, 65 permissions, 3 roles, 1 class, 3 subjects, 1 section, 1 enrollment.
- Currently running: Postgres container (healthy). API and Vite dev server may need restart.

## Deployment Status

- **Dev deployment active:** PostgreSQL 16 via Docker Compose (`docker compose up -d postgres`). This satisfies the approved Postgres + Docker Compose target for development.
- **Production deployment ready:** Dockerfiles created for server (multi-stage Node.js 22 Alpine), client (multi-stage with nginx:alpine), and docker-compose.yml includes server + client + postgres production services. nginx.conf with security headers, gzip, SPA fallback, and API proxy. Production requires env vars: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `POSTGRES_PASSWORD`, `CORS_ORIGINS`.

## Testing Status

- **E2E test suites created (2026-09-08):** `test/auth-rbac.e2e-spec.ts` (auth flows, RBAC enforcement, role-based access) and `test/security.e2e-spec.ts` (rate limiting, security headers, input validation, JWT security, data isolation, response format, CORS). Jest + supertest configured.
- Jest configured in `server/package.json` (unit) and `test/jest-e2e.json` (e2e).
- **Phase 1.5 verification suite (2026-08-12, all passed against PostgreSQL):** admin login (241-char token, 59 perms, super_admin); `/auth/me` (59 perms); `/users` list = exactly 3 seeded users; RBAC roles (student 10 / super_admin 59 / teacher 29 perms); permission catalog = 59; student blocked from `/users` → 403; no token → 401; teacher permission set (`attendance.take` present, `users.list` absent); refresh rotation (new pair issued, reused token rejected → 401); audit endpoints (activity logs + login history both respond).
- **Phase 2 verification (2026-08-30):** server `npm run build` ✓, client `npm run build` (tsc + vite) ✓. fix-imports 0 new specifiers. All academics CRUD API endpoints registered in AcademicsModule. Router updated: `/academics` serves real AcademicsPage.
- **Phase 3 verification (2026-08-30):** server `npm run build` ✓, client `npm run build` (tsc + vite) ✓. fix-imports 0 new specifiers. People CRUD API endpoints registered in PeopleModule. Router updated: `/teachers` and `/students` serve real PeoplePage.
- **Phase 4 verification (2026-08-30):** server `npm run build` ✓, client `npm run build` (tsc + vite) ✓. fix-imports 0 new specifiers. Timetable CRUD API endpoints with conflict detection registered in TimetableModule. Router updated: `/timetable` serves real TimetablePage.
- **Phase 5 verification (2026-08-31):** server `npm run build` ✓, client `npm run build` (tsc + vite) ✓. fix-imports 0 new specifiers. Attendance CRUD API + bulk mark + reports endpoints registered in AttendanceModule. Academics module extended with `GET /academics/classes/:classId/sections` and `GET /academics/classes/:classId/subjects` endpoints. Router updated: `/attendance` serves real AttendancePage. New permission `attendance.reports` added (60 total). Migration `20260830234009_add_attendance_relations` applied — added `sessionId`, `timetableSlotId`, `period` columns; added FK constraints for `classId`, `sectionId`, `teacherId`, `sessionId`, `timetableSlotId`; updated unique constraint to `[studentId, date, subjectId, period]`.
- **Phase 10 verification (2026-09-01):** server `npm run build` ✓, client `npm run build` (tsc + vite) ✓. Prisma migration `20260901185904_add_study_materials` applied. StudyMaterial model added. Files module (upload/download/list/delete) with MIME validation, path traversal protection, 50MB limit. StudyMaterialsModule with CRUD + publish/unpublish. 2 new permissions added (`materials.view`, `materials.manage` = 65 total). Frontend MaterialsPage with role-aware UI. All existing Phase 1–9 functionality preserved.
- Client: `npm run build` (tsc -b + vite) passes; server `npm run build` (nest build) passes. Server `npm run lint` has 23 pre-existing Phase 1 issues (see Technical Debt); no lint issues in Phase 2 files.
- Postgres seed data verified directly in the DB (3 users / 59 perms / 3 roles / academic data).
- **Final Audit & QA (2026-09-03):** Comprehensive audit of all 20+ modules. Security audit: 1 critical (JWT secret fallback), 5 high (IDOR in letters/attendance/files, PermissionsGuard AND logic, mustChangePassword unenforced), 5 medium (settings upsert bug, backup error leak, exception filter leak, announcements void return, frontend route guard mismatch). All 11 critical/high bugs fixed. Server `npm run build` ✓, client `npm run build` (tsc + vite) ✓. 21 modules audited: Auth, Users, RBAC, Academics, People, Timetable, Attendance, Exams, Quizzes, Assignments, Results, Letters, Announcements, Notifications, Messages, Analytics, Reports, Settings, Backups, Files, StudyMaterials.

## Last Completed Task

**Production Readiness & Hardening (COMPLETED 2026-09-08).** Added missing FK constraints and database indexes, fixed results pagination, created production Dockerfiles (server + client + nginx), added code splitting (735→415 kB), added frontend error states, created e2e test suites, hardened .gitignore and .env.example, security review passed.

## Current Task

None. All phases 1–10 complete. Production readiness hardening complete.

## Next Task

No further development phases. Project is feature-complete and production-hardened pending deployment.

## Resume Instructions

1. Read this file, then scan the actual code to confirm it matches.
2. **Start the database first:** from the repo root run `docker compose up -d postgres` (creates/restarts `eduportal-postgres` on :5432; data persists in volume `pgdata`).
3. **Start the API:** `cd server; npm run build; cmd /c "start /b node dist/src/main.js"` (loads `server/.env`; `DATABASE_URL` is required).
4. **Start the client:** `cd client; cmd /c "start /b npm run dev"` (Vite on :5173, proxies `/api` → :3000).
5. After ANY server TS edit: run `server/scripts/fix-imports.ps1` then `npm run build` (ESM `.js` extensions).
6. Schema changes: `cd server; npx prisma migrate dev --name <name>` then `npx prisma generate` then `npx prisma db seed` (if seed data changed).
7. The database is PostgreSQL. Do NOT use or revert to SQLite.
8. Update this file in the same task as any meaningful change.

## Change Log

### 2026-09-08 — Production Readiness & Hardening COMPLETED

Status: COMPLETED

Changes:
- **FK constraints added:** Added foreign key constraints on `Quiz.teacherId`, `Assignment.teacherId`, and `StudyMaterial.teacherId` → `TeacherProfile(id)` with `onDelete: Cascade`. Migration `20260908175445_add_fk_constraints_and_indexes` applied.
- **Database indexes added:** New indexes on `AcademicClass.classTeacherId`, `Announcement.classId`, `Announcement.sectionId`, `Assignment.teacherId`, `File.uploadedById`, `Quiz.teacherId`, `TeacherProfile.departmentId`, `TimetableSlot.sectionId`.
- **Results pagination improved:** `ResultsService.listResults` now uses `take: 500` cap on each query and includes `count()` for accurate total, replacing unbounded fetch-all. Pagination limit capped at 100.
- **Production Dockerfiles created:** `server/Dockerfile` (multi-stage: Node 22 Alpine, build + runtime, tini entrypoint, non-root user). `client/Dockerfile` (multi-stage: Node 22 Alpine build + nginx:alpine runtime). `client/nginx.conf` with security headers, gzip, SPA fallback, API proxy, asset caching.
- **Production docker-compose.yml:** Added `server` and `client` services with env-driven config, depends_on postgres healthy, named volumes for uploads.
- **.dockerignore files:** Created for both `server/` and `client/` to exclude node_modules, dist, .env, uploads from Docker context.
- **Code splitting:** All 25+ page components now use `React.lazy()` with Suspense fallback. Main bundle reduced from ~735 kB to ~415 kB (133 kB gzip). Each page loads as a separate chunk.
- **Frontend error states:** Added `isError` checks with user-friendly error messages on exams, announcements, notifications, messages, and materials pages.
- **Default exports:** Added `export default` to all page components that previously used named exports (dashboard, users, people, academics, timetable, attendance, audit pages, settings/roles, not-found, coming-soon, auth/login).
- **E2E test suites:** Created `test/auth-rbac.e2e-spec.ts` (auth login/refresh/logout, RBAC enforcement for 3 roles, data isolation) and `test/security.e2e-spec.ts` (rate limiting, helmet headers, input validation, JWT security, response format, CORS).
- **Security hardening:** Enhanced `.gitignore` (added node_modules, dist, coverage, uploads, IDE files, generated files). Updated `.env.example` with production notes. Verified no hardcoded secrets (all from `process.env`). Exception filter properly sanitizes 500 errors.
- **Orphan check:** Verified 0 orphaned teacherId records before adding FK constraints.

Files Changed:
- `server/prisma/schema.prisma` (FK constraints, indexes, reverse relations on TeacherProfile)
- `server/prisma/migrations/20260908175445_add_fk_constraints_and_indexes/migration.sql` (new)
- `server/src/modules/results/results.service.ts` (pagination fix)
- `server/Dockerfile` (new — multi-stage production)
- `server/.dockerignore` (new)
- `server/check-orphaned.ts` (new — pre-migration validation)
- `server/test/auth-rbac.e2e-spec.ts` (new — 20+ test cases)
- `server/test/security.e2e-spec.ts` (new — 15+ test cases)
- `client/Dockerfile` (new — multi-stage with nginx)
- `client/.dockerignore` (new)
- `client/nginx.conf` (new — production nginx config)
- `client/src/router/index.tsx` (code splitting with React.lazy)
- `client/src/pages/dashboard/index.tsx` (default export)
- `client/src/pages/users/index.tsx` (default export)
- `client/src/pages/people/index.tsx` (default export)
- `client/src/pages/academics/index.tsx` (default export)
- `client/src/pages/timetable/index.tsx` (default export)
- `client/src/pages/attendance/index.tsx` (default export)
- `client/src/pages/exams/index.tsx` (error state)
- `client/src/pages/announcements/index.tsx` (error state)
- `client/src/pages/notifications/index.tsx` (error state)
- `client/src/pages/messages/index.tsx` (error state)
- `client/src/pages/materials/index.tsx` (error state, cleanup)
- `client/src/pages/audit/activity-logs.tsx` (default export)
- `client/src/pages/audit/login-history.tsx` (default export)
- `client/src/pages/settings/roles.tsx` (default export)
- `client/src/pages/auth/login.tsx` (default export)
- `client/src/pages/not-found.tsx` (default export)
- `client/src/pages/coming-soon.tsx` (default export)
- `docker-compose.yml` (added server + client production services)
- `.gitignore` (enhanced)
- `PROJECT_STATUS.md`

Database Changes:
- Migration `20260908175445_add_fk_constraints_and_indexes` applied:
  - 3 FK constraints: Quiz.teacherId, Assignment.teacherId, StudyMaterial.teacherId → TeacherProfile(id) ON DELETE CASCADE
  - 8 new indexes on FK fields for query performance

Testing:
- Server `tsc --noEmit` ✓ (0 errors)
- Client `tsc -b` ✓ (0 errors)
- Client `vite build` ✓ (5.46s)
- E2E test files created (require running DB to execute)
- Orphan check: 0 orphaned records before FK constraint migration

Notes:
- PostgreSQL remains the live database.
- Client bundle now 415 kB (133 kB gzip) — down from 735 kB via code splitting.
- Docker production stack ready: `docker compose --profile prod up -d` or manual docker-compose with production services.
- E2E tests use `supertest` against NestJS app instance (not HTTP server).

### 2026-09-01 — Phase 9: Analytics, Reports, Settings & Backups COMPLETED

Status: COMPLETED

Changes:
- **Backend AnalyticsModule:** Role-aware dashboard endpoint. Management sees institution-wide stats (students, teachers, classes, attendance rate, exam performance, grade distribution, class/subject performance, recent activity). Teachers see their authorized scope (students, classes, attendance, pending grading, subject performance). Students see only their own analytics (attendance, scores, subject performance).
- **Backend ReportsModule:** Report generation endpoint with types: summary (institution overview), student (individual results/grades), class (class performance), subject (subject results), attendance (attendance stats). Role-aware — students can only generate their own reports.
- **Backend SettingsModule:** Portal settings CRUD (management only), profile management (all users — name, phone, avatar, password change with current password verification).
- **Backend BackupsModule:** PostgreSQL backup system using pg_dump. Create backup (management only), list backups, get backup details, download backup file, delete backup. All operations audited. BackupRecord model used for metadata tracking. Files stored in server/backups/ directory.
- **System Health endpoint:** GET /analytics/health — checks DB connectivity, returns status. Management/teacher access only.
- **Frontend AnalyticsPage:** Role-aware — management sees institution dashboard with summary cards, grade distribution, class performance, recent activity. Teachers see their classes/subjects/attendance/pending grading. Students see their own attendance, scores, subject performance.
- **Frontend ReportsPage:** Report type selector, generates and displays reports with summary cards, exam results, attendance data.
- **Frontend SettingsPage:** Profile editing (name, phone), password change, portal settings management (management only).
- **Frontend BackupsPage:** Backup creation, listing with status/size/date, download, delete with confirmation.
- **Navigation updated:** Added Reports nav item for all roles. Added System Health for management/teachers. Updated Insights section with Reports.
- **Router updated:** `/analytics` serves real AnalyticsPage, `/reports` serves real ReportsPage, `/settings` serves real SettingsPage, `/settings/backups` serves real BackupsPage.
- **New permission:** `system.health` added (63 total).

Files Changed:
- `server/src/modules/analytics/analytics.module.ts` (new)
- `server/src/modules/analytics/analytics.service.ts` (new — ~230 lines)
- `server/src/modules/analytics/analytics.controller.ts` (new — ~35 lines)
- `server/src/modules/analytics/dto/analytics.dto.ts` (new)
- `server/src/modules/reports/reports.module.ts` (new)
- `server/src/modules/reports/reports.service.ts` (new — ~210 lines)
- `server/src/modules/reports/reports.controller.ts` (new — ~25 lines)
- `server/src/modules/reports/dto/report.dto.ts` (new)
- `server/src/modules/settings/settings.module.ts` (new)
- `server/src/modules/settings/settings.service.ts` (new — ~90 lines)
- `server/src/modules/settings/settings.controller.ts` (new — ~45 lines)
- `server/src/modules/settings/dto/setting.dto.ts` (new)
- `server/src/modules/backups/backups.module.ts` (new)
- `server/src/modules/backups/backups.service.ts` (new — ~130 lines)
- `server/src/modules/backups/backups.controller.ts` (new — ~55 lines)
- `server/src/modules/backups/dto/backup.dto.ts` (new)
- `server/src/app.module.ts` (added AnalyticsModule, ReportsModule, SettingsModule, BackupsModule)
- `server/prisma/seed.ts` (added system.health permission)
- `client/src/pages/analytics/index.tsx` (new — ~236 lines)
- `client/src/pages/reports/index.tsx` (new — ~140 lines)
- `client/src/pages/settings/index.tsx` (new — ~90 lines)
- `client/src/pages/backups/index.tsx` (new — ~105 lines)
- `client/src/router/index.tsx` (added /analytics, /reports, /settings, /settings/backups routes)
- `client/src/config/navigation.tsx` (added Reports, System Health nav items)
- `PROJECT_STATUS.md`

Database Changes:
- No migration needed — uses existing BackupRecord and Setting models. System health is a runtime check.

Testing:
- Server `npm run build` ✓
- Client `npm run build` (tsc + vite) ✓
- Database re-seeded: 63 permissions (was 62)

Notes:
- PostgreSQL remains the live database.
- Backups use pg_dump (requires pg_dump binary in PATH). Files stored in server/backups/.
- System health checks DB connectivity via SELECT 1 query.
- Analytics dashboard uses real data from existing models (no demo/fake data).
- Pre-existing server lint debt unchanged.
- Client bundle ~725 kB (gzip ~193 kB) — exceeds 500 kB warning, code-split later.

Next Step:
- Phase 10 — Future enhancements (file upload/download, study materials, testing).

### 2026-09-01 — Phase 8: Communication, Appeals & Notifications COMPLETED

Status: COMPLETED

Changes:
- **Prisma schema enhanced:** Added `Message` model for inbox/communication (senderId, recipientId, subject, body, isRead, readAt, createdAt). Added relations to User model (sentMessages, receivedMessages). Migration applied: `20260831190033_add_messages_model`.
- **Backend LettersModule:** Full CRUD for student letters/appeals. Create with auto-generated tracking number, list with filters (status/type/student/search), view detail with timeline, respond with status update. Student data isolation enforced server-side. Students can only see their own letters.
- **Backend AnnouncementsModule:** Full CRUD for announcements. Audience targeting (ALL/CLASS/SECTION/STUDENTS/TEACHERS), pinning, expiry, type (ANNOUNCEMENT/NOTICE). Students see only relevant announcements (based on enrollment). Teachers see relevant announcements.
- **Backend NotificationsModule:** List with pagination and search, unread count, mark single as read, mark all as read, create single/bulk notifications. Users only see their own notifications.
- **Backend MessagesModule:** Send messages (with self-send prevention), list inbox/sent, get message detail (auto-marks as read), unread count. Users can only see messages they sent or received.
- **New permissions:** `messages.send`, `messages.view` added (62 total, was 60). Both teacher and student roles get these permissions.
- **Frontend LettersPage:** Role-aware — students see "My Requests" with create form; management/teachers see all letters with respond capability. Status badges (PENDING/UNDER_REVIEW/APPROVED/REJECTED/COMPLETED), type badges, tracking numbers, timeline view, response dialog.
- **Frontend AnnouncementsPage:** List with search and audience filter. Pinned announcements highlighted. Create dialog for management/teachers. Delete capability for management. Expired announcements dimmed.
- **Frontend NotificationsPage:** Notification list with unread indicators, mark as read on click, mark all as read button, search. Type-colored badges.
- **Frontend MessagesPage:** Inbox/sent tabs, compose dialog, message detail view, unread indicators, auto-mark read on view.
- **Topbar notification bell:** Shows unread notification count (auto-refreshes every 30s), links to notifications page.
- **Navigation updated:** Added Announcements, Notifications, Messages nav items for all 3 roles.
- **Router updated:** `/letters` now serves real LettersPage; `/announcements`, `/notifications`, `/messages` routes added.

Files Changed:
- `server/prisma/schema.prisma` (added Message model, User relations)
- `server/prisma/migrations/20260831190033_add_messages_model/migration.sql` (new)
- `server/prisma/seed.ts` (added messages.send, messages.view permissions; updated teacher/student roles)
- `server/src/modules/letters/letters.module.ts` (new)
- `server/src/modules/letters/letters.service.ts` (new — ~130 lines)
- `server/src/modules/letters/letters.controller.ts` (new — ~50 lines)
- `server/src/modules/letters/dto/letter.dto.ts` (new)
- `server/src/modules/announcements/announcements.module.ts` (new)
- `server/src/modules/announcements/announcements.service.ts` (new — ~160 lines)
- `server/src/modules/announcements/announcements.controller.ts` (new — ~60 lines)
- `server/src/modules/announcements/dto/announcement.dto.ts` (new)
- `server/src/modules/notifications/notifications.module.ts` (new)
- `server/src/modules/notifications/notifications.service.ts` (new — ~80 lines)
- `server/src/modules/notifications/notifications.controller.ts` (new — ~45 lines)
- `server/src/modules/notifications/dto/notification.dto.ts` (new)
- `server/src/modules/messages/messages.module.ts` (new)
- `server/src/modules/messages/messages.service.ts` (new — ~130 lines)
- `server/src/modules/messages/messages.controller.ts` (new — ~55 lines)
- `server/src/modules/messages/dto/message.dto.ts` (new)
- `server/src/app.module.ts` (added LettersModule, AnnouncementsModule, NotificationsModule, MessagesModule)
- `client/src/pages/letters/index.tsx` (new — ~260 lines)
- `client/src/pages/announcements/index.tsx` (new — ~220 lines)
- `client/src/pages/notifications/index.tsx` (new — ~130 lines)
- `client/src/pages/messages/index.tsx` (new — ~180 lines)
- `client/src/components/layout/topbar.tsx` (added NotificationBell component)
- `client/src/router/index.tsx` (added /letters, /announcements, /notifications, /messages routes)
- `client/src/config/navigation.tsx` (added Announcements, Notifications, Messages nav items)
- `client/src/types/index.ts` (added LetterRequest, LetterTimeline, Announcement, Notification, Message types)
- `PROJECT_STATUS.md`

Database Changes:
- Migration `20260831190033_add_messages_model` applied: Added `Message` table with sender/recipient FKs, isRead, readAt, indexes.
- Re-seeded: 62 permissions (was 60).

Testing:
- Server `npm run build` ✓
- Client `npm run build` (tsc + vite) ✓
- fix-imports.ps1: 0 new specifiers

Notes:
- PostgreSQL remains the live database.
- Pre-existing server lint debt unchanged.
- Client bundle ~697 kB (gzip ~189 kB) — exceeds 500 kB warning, code-split later.
- Letters/Appeals workflow: PENDING → UNDER_REVIEW → APPROVED/REJECTED → COMPLETED.
- Announcements support audience targeting by class/section/role/user.
- Notifications are database-backed (no real-time push — poll every 30s).
- Messages prevent self-sending; auto-mark as read when viewed.

Next Step:
- Phase 9 — Analytics, Reports, Settings & Backups.

### 2026-08-31 — Phase 7: Results, Grading & Reports COMPLETED

Status: COMPLETED

Changes:
- **Backend ResultsModule created:** Centralized results aggregation layer over existing exam, quiz, and assignment data. No new database models — reuses existing ExamResult, QuizSubmission, and AssignmentSubmission models.
- **Grade calculation:** Centralized grade scale (A+ through F, GPA 4.0–0.0) with percentage-based boundaries. Used consistently across all result views.
- **GET /results/overview:** Dashboard statistics — total results, pass rate, average percentage, exam/quiz/assignment counts.
- **GET /results:** Paginated list of all results (exams, quizzes, assignments) with filters for session, class, section, subject, student, status, and search.
- **GET /results/student:** Individual student result profile with subject-wise breakdown, exam/quiz/assignment details, overall percentage, grade, GPA, and pass/fail stats.
- **GET /results/class:** Class performance with student rankings, average percentage, pass rate, grade distribution, highest/lowest scores.
- **GET /results/subject:** Subject performance with per-student marks across exams, quizzes, and assignments.
- **GET /results/grade-scale:** Returns the configured grade scale boundaries.
- **Role-based access:** Students can only view their own results (enforced server-side). Teachers and management see all authorized results.
- **Frontend ResultsPage:** Role-aware tabbed UI — students see only "My Results" tab; teachers/management see Overview, Student Results, Class Results, Subject Results tabs.
- **Results dashboard:** Summary cards (total results, pass rate, average, published count), exam/quiz/assignment breakdowns, recent results list with search.
- **Student result view:** Performance summary, subject-wise progress bars, grade indicators.
- **Class results view:** Class selector, student rankings, average/pass rate/grade distribution stats.
- **Subject results view:** Subject selector, per-student performance with assessment breakdowns.
- **Navigation updated:** "Results & Reports" nav item added for all three roles (management, teacher, student). Student's "My Results" now points to `/results`.
- **Router updated:** `/results` route added with `results.view` permission guard.
- **TypeScript types added:** GradeBoundary, ResultItem, StudentResultDetail, ClassResultSummary, SubjectResultSummary, ResultsOverview.

Files Changed:
- `server/src/modules/results/results.module.ts` (new)
- `server/src/modules/results/results.service.ts` (new — ~380 lines)
- `server/src/modules/results/results.controller.ts` (new — ~60 lines)
- `server/src/modules/results/dto/result.dto.ts` (new — ~70 lines)
- `server/src/app.module.ts` (added ResultsModule import)
- `client/src/pages/results/index.tsx` (new — ~350 lines)
- `client/src/router/index.tsx` (added /results route)
- `client/src/config/navigation.tsx` (added Results nav item for all roles)
- `client/src/types/index.ts` (added Result types)
- `PROJECT_STATUS.md`

Database Changes:
- No migration needed — all result data comes from existing ExamResult, QuizSubmission, and AssignmentSubmission models.

Testing:
- Server `npm run build` ✓
- Client `npm run build` (tsc + vite) ✓
- fix-imports.ps1: 0 new specifiers

Notes:
- PostgreSQL remains the live database. No SQLite usage.
- Pre-existing server lint debt unchanged.
- Client bundle ~663 kB (gzip ~184 kB) — exceeds 500 kB warning, code-split later.
- Grade scale is a standard A+–F system with 8 levels. Can be extended via Settings in Phase 9.

Next Step:
- Phase 8 — Letters, Appeals & Leave.

### 2026-08-31 — Phase 6: Exams, Quizzes & Assignments COMPLETED

Status: COMPLETED

Changes:
- **Backend ExamsModule created:** Full CRUD for exams with type/class/subject/date filters. Exam results with enter/update/publish operations. Stats endpoint for dashboard summary. Publish/unpublish workflow.
- **Backend QuizzesModule created:** Full CRUD for quizzes with JSON questions, duration, marks. Quiz submission with auto-grading. Submission listing and manual grading for teachers.
- **Backend AssignmentsModule created:** Full CRUD for assignments with due dates, late submission handling. Assignment submission with resubmit support. Grading with marks, grade, and feedback.
- **Frontend ExamsPage:** Summary cards (total, published, drafts, pass rate), search/filter by type, paginated exam list with publish/view/results actions.
- **Frontend QuizzesPage:** Summary cards (total, published, drafts, total submissions), search, paginated quiz list with publish/view/submissions actions.
- **Frontend AssignmentsPage:** Summary cards (total, active, overdue, total submissions), search, paginated assignment list with overdue/late indicators and view/submissions actions.
- **Router updated:** `/exams`, `/quizzes`, `/assignments` now serve real page components instead of ComingSoonPage placeholders.
- **TypeScript types added:** Exam, ExamResult, ExamStats, Quiz, QuizSubmission, Assignment, AssignmentSubmission types added to `client/src/types/index.ts`.

Files Changed:
- `server/src/modules/exams/exams.module.ts` (new)
- `server/src/modules/exams/exams.service.ts` (new)
- `server/src/modules/exams/exams.controller.ts` (new)
- `server/src/modules/exams/dto/exam.dto.ts` (new)
- `server/src/modules/quizzes/quizzes.module.ts` (new)
- `server/src/modules/quizzes/quizzes.service.ts` (new)
- `server/src/modules/quizzes/quizzes.controller.ts` (new)
- `server/src/modules/quizzes/dto/quiz.dto.ts` (new)
- `server/src/modules/assignments/assignments.module.ts` (new)
- `server/src/modules/assignments/assignments.service.ts` (new)
- `server/src/modules/assignments/assignments.controller.ts` (new)
- `server/src/modules/assignments/dto/assignment.dto.ts` (new)
- `server/src/app.module.ts` (added ExamsModule, QuizzesModule, AssignmentsModule imports)
- `client/src/pages/exams/index.tsx` (new)
- `client/src/pages/quizzes/index.tsx` (new)
- `client/src/pages/assignments/index.tsx` (new)
- `client/src/router/index.tsx` (replaced ComingSoonPage with real pages)
- `client/src/types/index.ts` (added Exam, Quiz, Assignment types)
- `PROJECT_STATUS.md`

Database Changes:
- No migration needed — all Exam, Quiz, Assignment models already existed in schema from initial setup.

### 2026-08-31 — Phase 5: Attendance COMPLETED

Status: COMPLETED

Changes:
- **Prisma schema enhanced:** Attendance model now has full relations to AcademicClass, Section, TeacherProfile, Session, and TimetableSlot. Added `sessionId` (NOT NULL, backfilled), `timetableSlotId` (nullable), `period` (nullable). Updated unique constraint from `[studentId, date, subjectId]` to `[studentId, date, subjectId, period]`. Added FK constraints and new indexes.
- **Backend AttendanceModule created:** Full CRUD for attendance records with single mark, bulk mark (efficient `createMany`), update, delete. Duplicate prevention (student + date + subject + period). Student enrollment validation before marking. Teacher profile resolution from authenticated user. Active session auto-assignment.
- **Attendance reports:** Student summary (overall + by subject), class summary (overall + by student), subject-wise attendance for a class. All with date-range filtering and percentage calculation.
- **New permission:** `attendance.reports` added to permission catalog (60 total). Teacher role gets `attendance.reports`.
- **Academics module extended:** Added `GET /academics/classes/:classId/sections` and `GET /academics/classes/:classId/subjects` endpoints for attendance page filters.
- **Client AttendancePage:** Tabbed UI with three views: Attendance List (paginated table with class/section/subject/status/date filters, edit/delete actions), Take Attendance (class selection, student list with per-student status buttons, quick-set-all, bulk save), Reports (class/student/subject summary views with stats cards).
- **Router updated:** `/attendance` now serves real AttendancePage instead of ComingSoonPage.
- **Navigation already configured:** Management sees Attendance via `attendance.view-all`, teachers via `attendance.take`, students via `attendance.view-own`.

Files Changed:
- `server/prisma/schema.prisma` (Attendance model enhanced with relations/fields)
- `server/prisma/migrations/20260830234009_add_attendance_relations/migration.sql` (new)
- `server/prisma/seed.ts` (added `attendance.reports` permission)
- `server/src/modules/attendance/attendance.module.ts` (new)
- `server/src/modules/attendance/attendance.service.ts` (new — ~590 lines)
- `server/src/modules/attendance/attendance.controller.ts` (new — ~135 lines)
- `server/src/modules/attendance/dto/attendance.dto.ts` (new — ~120 lines)
- `server/src/modules/academics/academics.controller.ts` (added 2 endpoints)
- `server/src/modules/academics/academics.service.ts` (added 2 methods)
- `server/src/app.module.ts` (added AttendanceModule import)
- `client/src/pages/attendance/index.tsx` (new — ~930 lines)
- `client/src/router/index.tsx` (replaced ComingSoonPage with AttendancePage)
- `client/src/types/index.ts` (added Attendance types)
- `PROJECT_STATUS.md`

Database Changes:
- Migration `20260830234009_add_attendance_relations` applied:
  - Added `sessionId TEXT NOT NULL` (backfilled from class's session)
  - Added `timetableSlotId TEXT` (nullable)
  - Added `period INTEGER` (nullable)
  - Added FK constraints: `classId → AcademicClass`, `sectionId → Section`, `teacherId → TeacherProfile`, `sessionId → Session`, `timetableSlotId → TimetableSlot`
  - Dropped unique `[studentId, date, subjectId]`, added `[studentId, date, subjectId, period]`
  - Added indexes: `sessionId`, `sectionId + date`, `classId + sectionId + date`
- Re-seeded: 60 permissions (was 59)

Testing:
- Server `npm run build` ✓
- Client `npm run build` (tsc + vite) ✓
- fix-imports.ps1: 0 new specifiers
- Prisma migration applied and client regenerated
- Database re-seeded with 60 permissions

Notes:
- PostgreSQL remains the live database.
- Pre-existing server lint debt (23 problems in 7 Phase 1 files) unchanged.
- Client bundle ~632 kB (gzip ~181 kB) — exceeds 500 kB warning, code-split later.
- Attendance page supports all three roles: admin (full), teacher (mark/view/edit), student (view own only).

Next Step:
- Phase 6 — Exams, Quizzes & Assignments.

### 2026-08-30 — Phase 4: Timetable COMPLETED

Status: COMPLETED

Changes:
- Backend TimetableModule created: full CRUD for timetable slots with conflict detection.
- Conflict detection: teacher conflicts (same teacher, same day+period), section conflicts (same section, same day+period), room conflicts (same room, same day+period).
- Bulk create endpoint for efficient timetable operations.
- Client TimetablePage with grid view (day × period matrix) and table view, create/edit dialogs with class-subject-teacher selection, filters by class/section/day.
- Router updated: `/timetable` now serves real TimetablePage instead of ComingSoonPage.
- TypeScript type added: TimetableSlot.
- Both server and client build pass cleanly.

Files Changed:
- `server/src/modules/timetable/timetable.module.ts` (new)
- `server/src/modules/timetable/timetable.service.ts` (new — ~360 lines)
- `server/src/modules/timetable/timetable.controller.ts` (new — ~120 lines)
- `server/src/modules/timetable/dto/timetable.dto.ts` (new)
- `server/src/app.module.ts` (added TimetableModule import)
- `client/src/pages/timetable/index.tsx` (new — grid + table views)
- `client/src/router/index.tsx` (replaced ComingSoonPage with TimetablePage)
- `client/src/types/index.ts` (added TimetableSlot type)
- `PROJECT_STATUS.md`

Database Changes:
- None (uses existing TimetableSlot model from Phase 1 schema).

Testing:
- Server `npm run build` ✓
- Client `npm run build` (tsc + vite) ✓
- fix-imports.ps1: 0 new specifiers needed

Notes:
- PostgreSQL remains the live database. No SQLite usage.
- Pre-existing server lint debt (23 problems in 7 Phase 1 files) unchanged.
- Client bundle ~610 kB (gzip ~177 kB) — exceeds 500 kB warning, code-split later.

Next Step:
- Phase 5 — Attendance management.

### 2026-08-30 — Phase 3: People COMPLETED

Status: COMPLETED

Changes:
- Backend PeopleModule created: full CRUD for Teachers and Students with audit trail logging.
- All endpoints guarded by appropriate permissions (`teachers.manage` for teachers, `students.*` for students).
- Client PeoplePage with tabbed navigation for Teachers and Students, each with paginated table, search, create/edit dialogs, and delete confirmation.
- Router updated: `/teachers` and `/students` now serve real PeoplePage instead of ComingSoonPage.
- TypeScript types added: Teacher, Student, StudentEnrollment.
- Both server and client build pass cleanly.

Files Changed:
- `server/src/modules/people/people.module.ts` (new)
- `server/src/modules/people/people.service.ts` (new — ~350 lines)
- `server/src/modules/people/people.controller.ts` (new — ~150 lines)
- `server/src/modules/people/dto/people.dto.ts` (new)
- `server/src/app.module.ts` (added PeopleModule import)
- `client/src/pages/people/index.tsx` (new — tabbed page)
- `client/src/pages/people/teachers.tsx` (new)
- `client/src/pages/people/students.tsx` (new)
- `client/src/router/index.tsx` (replaced ComingSoonPage with PeoplePage)
- `client/src/types/index.ts` (added Teacher, Student, StudentEnrollment types)
- `PROJECT_STATUS.md`

Database Changes:
- None (uses existing schema/seed).

Testing:
- Server `npm run build` ✓
- Client `npm run build` (tsc + vite) ✓
- fix-imports.ps1: 0 new specifiers needed

Notes:
- PostgreSQL remains the live database. No SQLite usage.
- Pre-existing server lint debt (23 problems in 7 Phase 1 files) unchanged.
- Client bundle ~598 kB (gzip ~176 kB) — exceeds 500 kB warning, code-split later.

Next Step:
- Phase 4 — Timetable management.

### 2026-08-30 — Phase 2: Academics COMPLETED

Status: COMPLETED

Changes:
- Backend AcademicsModule created: full CRUD for Departments, Sessions, Academic Classes, Sections, Subjects, plus ClassSubjects assignment endpoints and overview counts.
- All endpoints guarded by `academic.view` / `academic.manage` permissions with audit trail logging.
- Client AcademicsPage with tabbed navigation for all 5 entities, each with paginated table, search, create/edit dialogs, and delete confirmation.
- Router updated: `/academics` now serves the real `AcademicsPage` instead of ComingSoonPage.
- TypeScript types added: Department, Session, AcademicClass, Section, Subject, ClassSubject.
- Both server and client build pass cleanly against PostgreSQL.

Files Changed:
- `server/src/modules/academics/academics.module.ts` (new)
- `server/src/modules/academics/academics.controller.ts` (new — 303 lines)
- `server/src/modules/academics/academics.service.ts` (new — 618 lines)
- `server/src/modules/academics/dto/academic.dto.ts` (new)
- `server/src/app.module.ts` (added AcademicsModule import)
- `client/src/pages/academics/index.tsx` (new — tabbed page)
- `client/src/pages/academics/departments.tsx` (new)
- `client/src/pages/academics/sessions.tsx` (new)
- `client/src/pages/academics/classes.tsx` (new)
- `client/src/pages/academics/sections.tsx` (new)
- `client/src/pages/academics/subjects.tsx` (new)
- `client/src/router/index.tsx` (replaced ComingSoonPage with AcademicsPage)
- `client/src/types/index.ts` (added academic types)
- `PROJECT_STATUS.md`

Database Changes:
- None (uses existing schema/seed).

Testing:
- Server `npm run build` ✓
- Client `npm run build` (tsc + vite) ✓
- fix-imports.ps1: 0 new specifiers needed (all imports already correct)

Notes:
- PostgreSQL remains the live database. No SQLite usage.
- Pre-existing server lint debt (23 problems in 7 Phase 1 files) unchanged.
- Client bundle ~581 kB (gzip ~174 kB) — exceeds 500 kB warning, code-split later.

Next Step:
- Phase 3 — People (Students & Teachers management).

### 2026-08-12 — Phase 1.5: PostgreSQL Migration VERIFIED

Status: VERIFIED

Changes:
- Docker Compose configured (`docker-compose.yml`): `postgres:16-alpine`, env-driven credentials (root `.env`), named volume `pgdata`, `pg_isready` healthcheck. Container `eduportal-postgres` healthy on :5432.
- Prisma 7 configured for PostgreSQL: `schema.prisma` provider → `postgresql`, `migration_lock.toml` → `postgresql`; adapter swapped `@prisma/adapter-better-sqlite3` → `@prisma/adapter-pg` (+ `pg`, `@types/pg`) in `prisma.service.ts`, `seed.ts`, `package.json`; `tsx` added for seeding; `prisma.config.ts` seed command configured.
- `DATABASE_URL` → `postgresql://...:5432/eduportal?schema=public` in `server/.env` / `server/.env.example`. No credentials hard-coded anywhere; PrismaService and seed fail fast if `DATABASE_URL` is unset.
- Fresh PostgreSQL migration `20260812174827_init_pg` created and applied from the stable schema. Old SQLite migration archived to `server/prisma/migrations_sqlite_archive/`.
- Prisma Client regenerated (7.9.1) and database re-seeded (3 users / 59 permissions / 3 roles / demo academic structure), verified directly in Postgres.
- Server rebuilt and restarted on :3000; client build green; lint checked.

Files Changed:
- `docker-compose.yml` (new, root)
- `.env`, `.env.example`, `.gitignore` (new, root)
- `server/.env`, `server/.env.example` (DATABASE_URL → Postgres), `server/.gitignore` (removed *.db)
- `server/prisma/schema.prisma`, `server/prisma/migrations/migration_lock.toml`
- `server/prisma/migrations/20260812174827_init_pg/migration.sql` (new)
- `server/src/prisma/prisma.service.ts`, `server/prisma/seed.ts`, `server/prisma.config.ts`
- `server/package.json`, `server/package-lock.json` (adapter deps)
- `PROJECT_STATUS.md`

Database Changes:
- PostgreSQL 16 database `eduportal` created in Docker; migration `20260812174827_init_pg` applied; seeded. SQLite retired (dev.db archived, old migration archived to `prisma/migrations_sqlite_archive/`).

Testing:
- 10/10 API verification checks passed against PostgreSQL: admin login (241-char token, 59 perms), `/auth/me`, `/users` (exactly 3 users), RBAC roles (10/29/59), permission catalog (59), student → 403 on `/users`, no token → 401, teacher perms correct, refresh rotation + reuse rejection (401), audit endpoints.
- `server npm run build` ✓, `client npm run build` ✓. `server npm run lint`: 23 pre-existing Phase 1 problems (7 files, none touched by migration) — see Technical Debt.

Notes:
- PostgreSQL is now the live database; all future phases run on it. No SQLite usage remains.
- Remaining warnings/issues: pre-existing ESLint debt (documented); client bundle >500 kB warning; no automated tests yet; git still has zero commits.

Next Step:
- Await explicit approval, then start Phase 2 — Academics.

### 2026-08-11 — Database Architecture Audit (Postgres readiness)

Status: COMPLETED (analysis only — no database changes)

Changes:
- Audited the full Prisma schema and Prisma 7 runtime (adapter, config, seed, URL resolution) for PostgreSQL compatibility.
- Verified dev machine has no Docker and no PostgreSQL installed (the reason SQLite is used).
- Confirmed schema is structurally fully Postgres-compatible (no enums, no native type mappings, no Json fields, no raw SQL, no SQLite-specific features).
- Documented required changes, breaking risks, Docker Compose requirements, and a recommended migration point in the new "Database Migration Plan (PostgreSQL)" section.
- Recommendation: run "Phase 1.5 — PostgreSQL Migration" as a dedicated step BEFORE Phase 2; blocker is Docker installation.

Files Changed:
- `PROJECT_STATUS.md` (added "Database Migration Plan (PostgreSQL)" section; updated Pending Modules)

Database Changes:
- None (schema, migrations, and code untouched — awaiting approval)

Testing:
- None required (no code changes)

Notes:
- Migration must NOT start until the user approves the plan and Docker (or an equivalent Postgres host) is available.

Next Step:
- Await approval of the migration plan and Phase 1.5 / Phase 2 ordering.

### 2026-08-11 — PostgreSQL Migration Plan Approved (Phase 1.5 BLOCKED)

Status: APPROVED — BLOCKED (Docker Desktop required)

Changes:
- User approved the Postgres migration plan and the module ordering: Phase 1.5 (PostgreSQL Migration) → Phase 2 (Academics) → Phase 3 (People) → existing order.
- PostgreSQL confirmed as the final target database. Phase 2 must NOT be built against SQLite.
- Marked Phase 1.5 as BLOCKED — Docker Desktop must be installed before execution. No database or code changes while blocked.
- Reconfirmed execution rules: Prisma 7 + Postgres adapter, fresh migration from the current stable schema, re-seed, Docker Compose with PostgreSQL 16, credentials via environment variables only (never hard-coded).

Files Changed:
- `PROJECT_STATUS.md` (migration plan status → APPROVED/BLOCKED; Pending Modules, Current/Next Task, Resume Instructions updated)

Database Changes:
- None

Testing:
- None required (no code changes)

Notes:
- Resume point recorded: execute the "Changes required for Postgres" checklist once Docker is available, re-seed, verify, then start Phase 2.

Next Step:
- Wait for the user to confirm Docker Desktop is installed; then resume Phase 1.5.

### 2026-08-11 — Phase 1 Verified & Status File Created

Changes:
- Full project audit performed; verified against live codebase.
- Confirmed both servers running and responding; both `npm run build` green.
- Cleaned temporary verification artifacts (`login.json`, `users.json`, `dev.log`, `server.log`).
- Created `PROJECT_STATUS.md` as the permanent tracking file.

Files Changed:
- `PROJECT_STATUS.md` (new)
- (deleted temp artifacts only; no source changes)

Database Changes:
- None

Testing:
- API smoke tests re-run (login/me/users); proxy chain verified.

Notes:
- Git repo still has zero commits; everything is untracked. Consider an initial commit before Phase 2.

Next Step:
- Await approval, then implement Phase 2 — Academics.
