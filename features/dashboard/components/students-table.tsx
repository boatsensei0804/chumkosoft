import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import StatusChip from "./status-chip";
import type { StudentSummary } from "../types";

interface StudentsTableProps {
  students: StudentSummary[];
  showGrade?: boolean;
}

const avatarTints = ["bg-brand-soft text-brand-ink", "bg-accent-soft text-[oklch(0.4_0.09_220)]", "bg-success-soft text-[oklch(0.42_0.1_152)]"];

function tintFor(id: string): string {
  const sum = id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return avatarTints[sum % avatarTints.length];
}

export default function StudentsTable({ students, showGrade = true }: StudentsTableProps): React.ReactNode {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow>
            <TableHead>นักเรียน</TableHead>
            <TableHead>ชั้นเรียน</TableHead>
            {showGrade && <TableHead>ระดับ</TableHead>}
            <TableHead>วันที่ลงทะเบียน</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead className="text-right">รายละเอียด</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarFallback className={cn("text-sm font-semibold", tintFor(s.id))}>{s.firstName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-ink-strong">
                      {s.firstName} {s.lastName}
                    </p>
                    <p className="tabular text-[12.5px] text-muted">รหัส {s.code}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-[14px] font-medium text-ink">{s.classroom}</TableCell>
              {showGrade && <TableCell className="text-[13.5px] text-muted">{s.grade}</TableCell>}
              <TableCell className="tabular text-[13.5px] text-muted">{s.enrolledAt}</TableCell>
              <TableCell>
                <StatusChip status={s.status} />
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href="/dashboard/students"
                  aria-label={`ดูรายละเอียดของ ${s.firstName} ${s.lastName}`}
                  className="inline-grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <ArrowRight className="size-[18px]" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
