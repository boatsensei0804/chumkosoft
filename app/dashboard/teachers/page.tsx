import type { Metadata } from "next";
import { Users, GraduationCap, Briefcase } from "lucide-react";
import PageHeader from "@/features/dashboard/components/page-header";
import StatStrip from "@/components/ui/stat-strip";
import TeachersBrowser from "@/features/teachers/components/teachers-browser";
import { listStaffPaginated, getStaffStats } from "@/services/staff-service";
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
  const [result, stats] = await Promise.all([
    listStaffPaginated({ page: parsePage(params.page), search: query, filter }),
    getStaffStats(),
  ]);

  return (
    <>
      <PageHeader
        title="ครูและบุคลากร"
        subtitle={`บุคลากรทางการศึกษาทั้งหมด ${stats.total.toLocaleString("th-TH")} คน · ปีการศึกษา 2568`}
      />
      <StatStrip
        items={[
          { label: "บุคลากรทั้งหมด", value: stats.total, hint: "คน", icon: Users, tone: "brand" },
          { label: "ครูผู้สอน", value: stats.teachers, hint: "คน", icon: GraduationCap, tone: "success" },
          { label: "บุคลากร", value: stats.personnel, hint: "คน", icon: Briefcase, tone: "default" },
        ]}
      />
      <TeachersBrowser page={result} query={query} filter={filter} />
    </>
  );
}
