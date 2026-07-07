import type { Metadata } from "next";
import PageHeader from "@/features/dashboard/components/page-header";
import GuardianManager from "@/features/guardians/components/guardian-manager";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
import { listStudentGuardians, listGuardianClassrooms } from "@/features/guardians/services/guardian-service";
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
  const [result, classrooms] = await Promise.all([
    listStudentGuardians({ page: parsePage(params.page), search: query, classroomId: classroomId || undefined }),
    listGuardianClassrooms(),
  ]);

  return (
    <>
      <PageHeader
        title="ผู้ปกครอง"
        subtitle="จัดการข้อมูลบิดา มารดา และผู้ปกครองของนักเรียน — สำหรับการผูก LINE และแจ้งเตือน ดูที่เมนู LINE / แจ้งเตือน"
      />
      <GuardianManager page={result} query={query} classrooms={classrooms} classroomId={classroomId} />
    </>
  );
}
