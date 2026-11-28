import Link from "next/link";
import type { Metadata } from "next";
import { Users, GraduationCap, Briefcase } from "lucide-react";
import PageHeader from "@/features/dashboard/components/page-header";
import StatStrip from "@/components/ui/stat-strip";
import TeachersBrowser from "@/features/teachers/components/teachers-browser";
import { listStaffPaginated, getStaffStats, getStaffDetail } from "@/services/staff-service";
import type { StaffFilter } from "@/repositories/staff-repository";
import { parsePage } from "@/types/pagination";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
import { getActiveTermLabel } from "@/services/dashboard-service";

export const metadata: Metadata = {
  title: "ครูและบุคลากร · chumkosoft",
};

export const dynamic = "force-dynamic";

const FILTERS: StaffFilter[] = ["all", "TEACHER", "STAFF"];

interface TeachersPageProps {
  searchParams: Promise<{ page?: string; q?: string; filter?: string }>;
}

export default async function TeachersPage({ searchParams }: TeachersPageProps): Promise<React.ReactNode> {
  const currentUser = await requireRoles(STAFF_ROLES);
  const params = await searchParams;
  const query = params.q ?? "";
  const filter: StaffFilter = FILTERS.includes(params.filter as StaffFilter) ? (params.filter as StaffFilter) : "all";
  const [result, stats, termLabel, ownDetail] = await Promise.all([
    listStaffPaginated({ page: parsePage(params.page), search: query, filter }),
    getStaffStats(),
    getActiveTermLabel(),
    currentUser.role === "TEACHER" && currentUser.staffId ? getStaffDetail(currentUser.staffId) : Promise.resolve(null),
  ]);
  const ownStaff = ownDetail;
  const visibleResult = currentUser.role === "ADMIN" ? result : {
    ...result,
    rows: result.rows.map((staff) => staff.id === currentUser.staffId ? staff : {
      ...staff, birthDate: null, nationalId: null, positionNumber: null, salary: null,
      licenseNumber: null, licenseExpiry: null, loginEmail: null,
    }),
  };

  return (
    <div className="xl:flex xl:h-full xl:min-h-0 xl:flex-col">
      <PageHeader pose="staff"
        title="ครูและบุคลากร"
        actions={currentUser.role === "ADMIN" && <Link href="/dashboard/line/teachers" className="inline-flex min-h-10 items-center rounded-xl border border-line bg-white px-3 text-sm font-semibold text-brand-ink">ดูสถานะบัญชีเว็บและ LINE</Link>}
        subtitle={`บุคลากรทางการศึกษาทั้งหมด ${stats.total.toLocaleString("th-TH")} คน · ${termLabel}`}
      />
      {stats.total > 0 && <StatStrip
        items={[
          { label: "บุคลากรทั้งหมด", value: stats.total, hint: "คน", icon: Users, tone: "brand" },
          { label: "ครูผู้สอน", value: stats.teachers, hint: "คน", icon: GraduationCap, tone: "success" },
          { label: "บุคลากร", value: stats.personnel, hint: "คน", icon: Briefcase, tone: "default" },
        ]}
      />}
      <TeachersBrowser page={visibleResult} query={query} filter={filter} canManageAccounts={currentUser.role === "ADMIN"} ownStaffId={currentUser.staffId} ownStaff={ownStaff} />
    </div>
  );
}
