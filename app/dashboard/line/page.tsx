import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, CircleCheck, Clock } from "lucide-react";
import PageHeader from "@/features/dashboard/components/page-header";
import StatStrip from "@/components/ui/stat-strip";
import LineManager from "@/features/line/components/line-manager";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
import { listStudentGuardians, listGuardianClassrooms, getGuardianStats } from "@/features/guardians/services/guardian-service";
import { isLineConfigured } from "@/lib/line";
import { parsePage } from "@/types/pagination";

export const metadata: Metadata = {
  title: "LINE / แจ้งเตือน · chumkosoft",
};

export const dynamic = "force-dynamic";

interface LinePageProps {
  searchParams: Promise<{ page?: string; q?: string; classroom?: string }>;
}

export default async function LinePage({ searchParams }: LinePageProps): Promise<React.ReactNode> {
  const user = await requireRoles(STAFF_ROLES);
  const params = await searchParams;
  const query = params.q ?? "";
  const classroomId = params.classroom ?? "";
  const [result, classrooms, stats] = await Promise.all([
    listStudentGuardians({ page: parsePage(params.page), search: query, classroomId: classroomId || undefined }),
    listGuardianClassrooms(),
    getGuardianStats({ search: query, classroomId: classroomId || undefined }),
  ]);

  return (
    <>
      <PageHeader
        title="LINE / แจ้งเตือนผู้ปกครอง"
        subtitle="ผูกบัญชี LINE ของผู้ปกครองเข้ากับนักเรียน เพื่อส่งแจ้งเตือนอัตโนมัติเมื่อนักเรียนเข้าโรงเรียน"
        actions={user.role === "ADMIN" ? <Link href="/dashboard/line/teachers" className="rounded-lg border border-line bg-card px-4 py-2 text-sm font-semibold text-brand-ink">ดูสถานะ LINE ครู</Link> : undefined}
      />
      <StatStrip
        items={[
          { label: "ผู้ปกครองทั้งหมด", value: stats.withGuardian, hint: "คน มีข้อมูล", icon: MessageSquare, tone: "brand" },
          { label: "เชื่อม LINE แล้ว", value: stats.linked, hint: "ราย", icon: CircleCheck, tone: "success" },
          { label: "รอผูกบัญชี", value: stats.pending, hint: "ราย", icon: Clock, tone: "warning" },
        ]}
      />
      <LineManager page={result} query={query} configured={isLineConfigured()} classrooms={classrooms} classroomId={classroomId} />
    </>
  );
}
