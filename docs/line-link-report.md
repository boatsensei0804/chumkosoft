# LINE binding report

Staff can open `/dashboard/line/report` from the LINE management page. Reports cover students enrolled in the active term and its academic year, excluding deleted records.

- A student counts as linked once when at least one parent account is linked, even if several accounts exist. Pending and unprepared totals count only students without a linked account. An empty denominator displays a dash.
- Classroom summaries keep their full denominator when a name, code, or status filter is applied. Exports include all filtered students, across pagination.
- Only unused binding codes are shown. A consumed code is cleared by the existing binding flow. Reading or exporting does not create, renew, revoke, or send codes.
- CSV uses UTF-8 BOM for Excel. Strictly numeric identifiers use constant string formulas to preserve leading zeros. Untrusted text is escaped against formula injection.
- PDF uses bundled Prompt fonts. Every classroom begins on a new page, with repeated table headings on continuation pages.
- Profile names use the existing cache and a bounded lookup budget. An unavailable display name does not change the stored binding state. Raw LINE user IDs are never exported or passed to the report client.
- Export routes require the same staff roles as LINE management and return private, no-store responses.

A separate “ดาวน์โหลด PDF กราฟสรุป” download (`format=pdf&view=charts`) renders vector donut and stacked classroom charts with Prompt fonts. The graph scope follows the selected classroom, or the entire school when all classrooms are selected. Search/status filters and pagination do not change chart counts. It contains aggregate statistics only, without student/parent names, LINE identities, or binding codes. Classroom rows repeat their heading on continuation pages; empty denominators display a dash. Existing CSV and detailed classroom PDF downloads retain their behavior.
