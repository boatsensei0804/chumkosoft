# Product

## Register

product

## Users

**Primary — school / institution staff (ADMIN, TEACHER).** Power users who work inside
the system daily: managing student and teacher records, courses, enrollment, and
schedules. They are on desktop, often for long sessions, and value density, speed, and
predictable, low-friction workflows over visual flourish.

**Secondary — STUDENT and PARENT.** Occasional users who log in to check schedules,
grades, courses, and announcements. They arrive with a specific question, frequently on
mobile, and need clarity and calm far more than density.

The system is role-aware (RBAC: `ADMIN`, `TEACHER`, `STUDENT`, `PARENT`); the same
surfaces present differently by role, and permissions are always enforced server-side.

## Product Purpose

chumkosoft is a school / education management platform: a single system of record for
students, teachers/educational personnel, courses, timetables, and attendance. It exists
to replace scattered spreadsheets and manual paperwork with one authoritative,
permissioned source of truth that each role can act on safely.

**Core domain (entities):**
- **Academic Year + Term** — the scoping dimension. Nearly every record belongs to a
  specific year + term; the same student, course, or teacher recurs across terms with
  term-specific data.
- **Students** — student records/profiles.
- **Teachers & educational personnel** — staff records.
- **Courses (subjects)** — the catalog of what is taught, offered per term.
- **Teaching schedule (ตารางสอน)** — a teacher's timetable: which subject, class, period,
  and room they teach.
- **Class schedule (ตารางเรียน)** — a classroom's/student's timetable, the mirror of the
  teaching schedule.
- **Attendance / check-in** — per-class roll call (เช็คชื่อ) and school entry
  (การเข้าโรงเรียน), both derived from the timetable.

**Dependency chain:** the **timetable is the backbone**. A timetable slot references a
course + its assigned teacher + period + room, all within a year+term. Class schedules,
student rosters, and attendance all reference timetable slots. Change the timetable and
the dependent views follow.

**Cross-cutting rules (apply to the whole platform):**
1. **Term-scoped:** all data references academic year + term.
2. **Drag-and-drop timetabling:** building/editing the teaching schedule is done by
   dragging course/teacher blocks onto period slots.
3. **Soft delete everywhere:** every entity supports view / edit / delete, but delete is a
   soft delete (mark inactive, never hard-delete the row) so history stays intact.
4. Full CRUD on every entity, always permission-checked server-side by role.

Success looks like: staff complete routine records work faster and with fewer errors;
students and teachers self-serve their timetables and attendance without contacting the
office; and every action is correctly scoped to the user's role and to the active term.

## Interface design

See [DESIGN.md](DESIGN.md) for the visual system and [the screen specifications](docs/interface-screens.md) for page-level behavior.

## Accessibility & Inclusion

- Target **WCAG 2.1 AA**. Body text ≥4.5:1, large/bold text ≥3:1, visible focus rings on
  every interactive element, keyboard operability throughout.
- Do not encode meaning in color alone (status, validation) — pair with text or icon,
  for color-blind users and print.
- Honor `prefers-reduced-motion`: motion conveys state only, and always has a
  reduced/instant alternative.
- Localization-aware: the primary audience is Thai; design for Thai and English text
  (line-height and wrapping for Thai script, no truncation of names, flexible label
  widths). Never hardcode user-facing strings in a way that blocks translation.
- Mobile-first for the student/parent surfaces; structural responsive behavior (collapsing
  nav, responsive tables) rather than fluid typography.
