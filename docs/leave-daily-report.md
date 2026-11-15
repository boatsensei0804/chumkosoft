# Daily leave requests

`/dashboard/leave-requests` uses a selected date in Bangkok (today by default). A request belongs to each day in its inclusive start/end interval, regardless of when the parent sent it. The all-dates option lets staff find old requests in the current active term; the summary still uses only the selected date.

The denominator is the number of distinct nondeleted students with nondeleted enrollments in nondeleted classrooms in the current active term/year, matching the school's LINE enrollment reporting. Advisors see requests only for their assigned classrooms; the denominator remains the entire school and the UI labels this scope.

Pending and approved requests contribute to distinct-student percentages. Rejected requests remain visible in status counts but do not count as students on leave. Students are counted once overall and once per request kind; percentages across kinds may overlap. List filters and pagination do not change summary totals. Reviewed requests no longer have a 100-row reporting limit.

Sender details resolve the actual `parentLineUserId` on the request, not an arbitrary guardian. Display names are current LINE profile/cache data; registered guardian names match the same sender ID. A stable hashed reference distinguishes identical names. Raw LINE IDs remain server-side. If the profile is unavailable, the reference remains visible.

Only admins can soft-delete a request, with an explicit confirmation. The request, timestamps, deleting actor, and an atomic audit record remain stored. Deleted requests disappear from the list, summary, and parent LINE history; they cannot be reviewed or retried. This operation sends no LINE message and never reverses attendance or points. Approved permissions remain valid for attendance checks, late-point exemptions, and overlapping-date checks, even when hidden. Deleting a pending request releases its overlap constraint. Retaining its unique LINE message ID prevents webhook replay from recreating it.

Migration: `20261115130000_leave_request_soft_delete` adds fields with a false default; existing requests remain visible. No data is deleted by the migration.

The summary share button creates a local, editable text draft for manual copying to LINE. It uses the selected date and report scope, independently of list filters or pagination. Names are opt-in and grouped by classroom, excluding rejected requests; reasons, guardian identities, and sender LINE references are not included. Long drafts are split into contiguous copyable parts. This feature does not call the LINE API or change request records.
