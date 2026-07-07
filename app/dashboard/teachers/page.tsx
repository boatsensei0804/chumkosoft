import type { Metadata } from "next";
import PageHeader from "@/features/dashboard/components/page-header";
import TeachersBrowser from "@/features/teachers/components/teachers-browser";
import { listStaffPaginated } from "@/services/staff-service";
import type { StaffFilter } from "@/repositories/staff-repository";
import { parsePage } from "@/types/pagination";

export const metadata: Metadata = {
  title: "ครูและบุคลากร · chumkosoft",
};

export const dynamic = "force-dynamic";

const FILTERS: StaffFilter[] = ["all", "TEACHER", "STAFF"];

interface TeachersPageProps {
  searchParams: Promise<{ page?: string; q?: string; filter?: string }>;
}

export default async function TeachersPage({ searchParams }: TeachersPageProps): Promise<React.ReactNode> {
  const params = await searchParams;
  const query = params.q ?? "";
  const filter: StaffFilter = FILTERS.includes(params.filter as StaffFilter) ? (params.filter as StaffFilter) : "all";
  const result = await listStaffPaginated({ page: parsePage(params.page), search: query, filter });

  return (
    <>
      <PageHeader
        title="ครูและบุคลากร"
        subtitle={`บุคลากรทางการศึกษาทั้งหมด ${result.total.toLocaleString("th-TH")} คน · ปีการศึกษา 2568`}
      />
      <TeachersBrowser page={result} query={query} filter={filter} />
    </>
  );
}
