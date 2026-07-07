import Link from "next/link";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Avatar from "@mui/material/Avatar";
import Icon from "./icon";
import StatusChip from "./status-chip";
import type { StudentSummary } from "../types";

interface StudentsTableProps {
  students: StudentSummary[];
  showGrade?: boolean;
}

const avatarTints = [
  { bg: "var(--brand-soft)", fg: "var(--brand-ink)" },
  { bg: "var(--accent-soft)", fg: "oklch(0.4 0.09 220)" },
  { bg: "var(--success-soft)", fg: "oklch(0.42 0.1 152)" },
];

function tintFor(id: string): { bg: string; fg: string } {
  const sum = id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return avatarTints[sum % avatarTints.length];
}

export default function StudentsTable({ students, showGrade = true }: StudentsTableProps): React.ReactNode {
  return (
    <div className="overflow-x-auto">
      <Table sx={{ minWidth: 640 }}>
        <TableHead>
          <TableRow>
            <TableCell>นักเรียน</TableCell>
            <TableCell>ชั้นเรียน</TableCell>
            {showGrade && <TableCell>ระดับ</TableCell>}
            <TableCell>วันที่ลงทะเบียน</TableCell>
            <TableCell>สถานะ</TableCell>
            <TableCell align="right">รายละเอียด</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {students.map((s) => {
            const tint = tintFor(s.id);
            return (
              <TableRow
                key={s.id}
                sx={{
                  "&:last-child td": { borderBottom: 0 },
                  "&:hover": { backgroundColor: "var(--surface-2)" },
                  transition: "background-color 120ms ease",
                }}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar sx={{ width: 36, height: 36, bgcolor: tint.bg, color: tint.fg, fontSize: 14 }}>
                      {s.firstName.charAt(0)}
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-ink-strong">
                        {s.firstName} {s.lastName}
                      </p>
                      <p className="tabular text-[12.5px] text-muted">รหัส {s.code}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-[14px] font-medium text-ink">{s.classroom}</span>
                </TableCell>
                {showGrade && (
                  <TableCell>
                    <span className="text-[13.5px] text-muted">{s.grade}</span>
                  </TableCell>
                )}
                <TableCell>
                  <span className="tabular text-[13.5px] text-muted">{s.enrolledAt}</span>
                </TableCell>
                <TableCell>
                  <StatusChip status={s.status} />
                </TableCell>
                <TableCell align="right">
                  <Link
                    href={`/dashboard/students`}
                    aria-label={`ดูรายละเอียดของ ${s.firstName} ${s.lastName}`}
                    className="inline-grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    <Icon name="arrow_forward" sx={{ fontSize: 18 }} />
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
