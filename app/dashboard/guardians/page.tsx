import type { Metadata } from "next";
import PageHeader from "@/features/dashboard/components/page-header";
import GuardianManager from "@/features/guardians/components/guardian-manager";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
import { listStudentGuardians } from "@/features/guardians/services/guardian-service";
import { isLineConfigured } from "@/lib/line";
import { parsePage } from "@/types/pagination";

export const metadata: Metadata = {
  title: "ผู้ปกครอง · chumkosoft",
};

export const dynamic = "force-dynamic";

interface GuardiansPageProps {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function GuardiansPage({ searchParams }: GuardiansPageProps): Promise<React.ReactNode> {
  await requireRoles(STAFF_ROLES);
  const params = await searchParams;
  const query = params.q ?? "";
  const result = await listStudentGuardians({ page: parsePage(params.page), search: query });

  return (
    <>
      <PageHeader
        title="ผู้ปกครองและ LINE"
        subtitle="จัดการข้อมูลผู้ปกครองของนักเรียน และผูกบัญชี LINE เพื่อรับแจ้งเตือนเมื่อนักเรียนเข้าโรงเรียน"
      />
      <GuardianManager page={result} query={query} configured={isLineConfigured()} />
    </>
  );
}
