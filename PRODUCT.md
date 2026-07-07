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

## Brand Personality

Trustworthy, calm, and competent — the quiet confidence of institutional software people
rely on, not consumer flash. Three words: **dependable, clear, unobtrusive.**

The interface should feel like a well-run school office: organized, legible, and
respectful of the user's time. It recedes into the task rather than competing for
attention. Tone in copy is plain, direct, and reassuring — never playful at the expense
of clarity, never cold.

## Anti-references

- **Generic SaaS-cream dashboards** — big gradient hero metric, identical icon-card grids,
  purple-to-blue gradients. Reads as templated; carries no institutional trust.
- **Consumer ed-tech gamification** — cartoon mascots, confetti, streaks, badges. Wrong
  register for a system of record used by staff all day.
- **Enterprise-beige legacy admin** — cramped gray tables, tiny hit targets, no empty or
  loading states, inconsistent controls screen to screen. The thing this replaces.
- **Over-designed marketing polish inside the app** — display fonts on labels, decorative
  motion, glassmorphism. The tool should disappear into the task.

## Design Principles

1. **The tool disappears into the task.** Earned familiarity over novelty. Standard
   navigation, standard affordances, consistent component vocabulary screen to screen.
   Delight is reserved for moments, never spread across pages.
2. **Role is the frame.** Every surface is designed for who is looking. Show each role
   only what they can act on; never expose an affordance a user isn't permitted to use.
3. **Density where staff need it, calm where families need it.** Data-dense tables and
   compact forms for daily staff work; spacious, plainly-labeled read views for
   students and parents.
4. **Trust is built from completeness.** Every interactive state exists — hover, focus,
   active, disabled, loading, error, empty. Skeletons over spinners; empty states that
   teach the interface. Half-finished states erode institutional trust fastest.
5. **Legibility is non-negotiable.** Real contrast, real hit targets, real focus rings.
   This is software people are required to use, often for hours — readability outranks
   elegance every time.

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
