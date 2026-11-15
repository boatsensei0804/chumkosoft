# Parent late-arrival requests

- LINE: select the linked student, choose `ขอมาสาย`, pick one date and expected Thai arrival time, choose a reason, review, confirm.
- Both guardian records and direct student-linked LINE accounts can request only for their linked children.
- New requests must be made before the expected arrival time and before an existing actual check-in for that date. Requests stay within the active term and cannot overlap another pending/approved request.
- Advisors receive a notification immediately. Only the assigned advisor or an administrator can review.
- Pending or rejected requests do not exempt points.
- Approval exempts the automatic 10-point late-entry deduction for the requested date, not the review date. An existing deduction is set to zero; no positive bonus is created and manual points are untouched.
- Real scan timestamps and late flags remain unchanged. Permission approval does not mark attendance as present or as full-day leave.
- Approval may occur after the check-in and refund that day's automatic penalty.
- Approval and penalty processing use the same PostgreSQL transaction-level advisory lock per term/student/day to serialize concurrent updates.
- LINE date/time values are interpreted as Asia/Bangkok; school-day database keys use UTC midnight of that local calendar date.
- Migration `20261115090000_late_arrival_requests` adds a LeaveKind enum member and a nullable expected-arrival field. Old sick/personal requests retain null times.

Validation: unit tests cover parent ownership, future time, duplicates, teacher scope, pending vs approved, refund idempotency, and preservation of attendance. Build and Prisma schema validation are required before deployment. Actual LINE taps and database concurrency should also be checked in a test environment; local Docker was unavailable during development.
