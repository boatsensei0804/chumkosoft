# Student registry workspace

The student page shows full-registry totals, current-term classroom placement, gender proportions, enrollment-status totals, and classroom gender counts before the paginated roster. Unplaced students are counted separately and are never presented as actively enrolled. If there is no active term/year, historical placements are not used as current placements.

The registry snapshot selects only IDs, names, student codes, stored gender, and current-term enrollment status/classroom. It excludes deleted students, enrollments, classrooms, and years. Current classroom counts plus unassigned students reconcile to the total registry; male/female/other-or-unspecified counts also reconcile to the total. No gender is inferred from names or prefixes.

Clicking an aggregate count starts a fresh roster filter and moves to the roster. The room/gender/grade/status/search controls can be combined. Filtering occurs over the complete registry snapshot before pagination; full editable fields load only for the requested page. Page numbers are clamped after filtering. Roster filters do not change overview totals. Current-term placement is also enforced in the paginated row details, including the no-active-term case.

Desktop room statistics use a compact table; mobile uses room cards. The room overview initially shows six rooms and expands on demand. The existing student detail, editing, creation, and deletion flows remain accessible from the roster.
