# UX/UI implementation coverage

Updated: 2026-11-14. Scope: staff-managed information, family portal, account access, and desktop scanner administration. Live face recognition runs in the desktop app; `/scan` redirects to device administration.

## Verification labels

- Implemented means the described code exists; it does not mean the entire screen was redesigned.
- Production build, TypeScript, lint, and unit tests are separate from visual and interaction verification.
- Authenticated desktop, phone, and tablet browser review is still pending for this revision. Do not call every page fully redesigned or visually verified.

| Page | Implemented presentation and interaction |
| --- | --- |
| Dashboard | Daily roll-call totals, progress, room search and filters, room summary dialog, separate registry totals |
| Students | Mobile records, explicit view/manage controls, detail dialog, categorized record sections, existing edit form dialog |
| Teachers and personnel | Mobile records, explicit view/manage controls, categorized detail dialog, existing edit/account form |
| Classrooms | Mobile records and management controls; detail split into roster and offerings, linked student records |
| Courses | Mobile records, detail preview, edit dialog, explicit management controls |
| Rooms and places | Mobile records, detail preview, edit dialog, explicit management controls |
| Guardians | Room filtering, mobile records, record previews, explicit per-person management controls; existing contact fields retained |
| Attendance | Distinct mode cards, calendar, mobile room and student summaries, touch-sized status controls |
| Timetable | School/class/teacher views; mobile day lists, lesson details dialog; editing context retained when changing room |
| Leave requests | Summary counts, status/room/type/search filters, details and review dialogs |
| Behavior | Summary figures, student and room search, score/history dialog, explicit save confirmation, existing edit/delete controls |
| Face datasets | Readiness percentage, room/student views, existing enrollment controls; registration remains separate from live recognition |
| Scanner accounts | Desktop-app wording, device management link, existing account CRUD dialogs |
| Scanner devices | Mascot page header, online and pending-event totals, status records, camera/time settings dialogs |
| Pair scanner | Mascot connection state, existing code verification and credential approval |
| LINE parents | Overview vs account workspace, per-student account/code management dialog |
| LINE teachers | Summary status and per-person code/account management dialog |
| My LINE | Account/connection workspace separated from notification information and related tasks |
| LINE announcements | Current recipients and recent-history totals, compose/review dialogs, search/incomplete filter, full message details |
| Settings | Academic/calendar/LINE workspace; read-only period timeline and period editing dialog |
| Family/student portal | Identity/context summary, mobile day selection, lesson details dialog; existing access scope retained |
| Login | Responsive mascot layout and account help; authentication logic unchanged |
| Unauthorized | Role-specific home link and logout; authorization remains enforced |
| LINE print and PDF | Existing A4 paper layout retained; not redesigned in this revision |
| Legacy web scan | Camera/recognition screen removed; authenticated redirect to scanner devices |

## Browser acceptance checklist (pending)

1. Review real records at phone, tablet, and desktop widths; check overflow, text wrapping, and touch targets.
2. Open/close dialogs using touch, Escape, keyboard, and browser Back; check focus and scroll position.
3. Exercise role-specific views for admin, teacher, family/student, and kiosk with their actual permissions.
4. Verify error/success feedback and drafts when submitting and dismissing dialogs.
5. Check counts against actual active-term data. Distinguish recent-history counts from lifetime totals and LINE acceptance from message reads.
6. Confirm desktop scanner pairing, heartbeat, upload, and offline sync remain intact after retiring the web scan screen.
