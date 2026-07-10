import type { Metadata } from "next";
import { GraduationCap, UserCheck, UserX } from "lucide-react";
import PageHeader from "@/features/dashboard/components/page-header";
import StatStrip from "@/components/ui/stat-strip";
import GuardianManager from "@/features/guardians/components/guardian-manager";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
import { listStudentGuardians, listGuardianClassrooms, getGuardianStats } from "@/features/guardians/services/guardian-service";
import { parsePage } from "@/types/pagination";

export const metadata: Metadata = {
  title: "ผู้ปกครอง · chumkosoft",
};

export const dynamic = "force-dynamic";

interface GuardiansPageProps {
  searchParams: Promise<{ page?: string; q?: string; classroom?: string }>;
}

export default async function GuardiansPage({ searchParams }: GuardiansPageProps): Promise<React.ReactNode> {
  await requireRoles(STAFF_ROLES);
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
        title="ผู้ปกครอง"
        subtitle="จัดการข้อมูลบิดา มารดา และผู้ปกครองของนักเรียน — สำหรับการผูก LINE และแจ้งเตือน ดูที่เมนู LINE / แจ้งเตือน"
      />
      <StatStrip
        items={[
          { label: "นักเรียนทั้งหมด", value: stats.students, hint: "คน", icon: GraduationCap, tone: "brand" },
          { label: "มีผู้ปกครองแล้ว", value: stats.withGuardian, hint: "คน", icon: UserCheck, tone: "success" },
          { label: "ยังไม่มีผู้ปกครอง", value: Math.max(0, stats.students - stats.withGuardian), hint: "คน", icon: UserX, tone: "warning" },
        ]}
      />
      <GuardianManager page={result} query={query} classrooms={classrooms} classroomId={classroomId} />
    </>
  );
}
