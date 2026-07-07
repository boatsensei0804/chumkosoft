import type { Metadata } from "next";
import PageHeader from "@/features/dashboard/components/page-header";
import LineManager from "@/features/line/components/line-manager";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
import { listStudentGuardians } from "@/features/guardians/services/guardian-service";
import { isLineConfigured } from "@/lib/line";
import { parsePage } from "@/types/pagination";

export const metadata: Metadata = {
  title: "LINE / แจ้งเตือน · chumkosoft",
};

export const dynamic = "force-dynamic";

interface LinePageProps {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function LinePage({ searchParams }: LinePageProps): Promise<React.ReactNode> {
  await requireRoles(STAFF_ROLES);
  const params = await searchParams;
  const query = params.q ?? "";
  const result = await listStudentGuardians({ page: parsePage(params.page), search: query });

  return (
    <>
      <PageHeader
        title="LINE / แจ้งเตือนผู้ปกครอง"
        subtitle="ผูกบัญชี LINE ของผู้ปกครองเข้ากับนักเรียน เพื่อส่งแจ้งเตือนอัตโนมัติเมื่อนักเรียนเข้าโรงเรียน"
      />
      <LineManager page={result} query={query} configured={isLineConfigured()} />
    </>
  );
}
