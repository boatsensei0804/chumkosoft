import type { Metadata } from "next";
import { GraduationCap, CircleCheck, Clock, PauseCircle } from "lucide-react";
import PageHeader from "@/features/dashboard/components/page-header";
import StatStrip from "@/components/ui/stat-strip";
import StudentsBrowser from "@/features/dashboard/components/students-browser";
import { listStudentsPaginated, listClassroomOptions, getStudentStats } from "@/services/student-service";
import { parsePage } from "@/types/pagination";
import type { EnrolmentStatus } from "@/features/dashboard/types";

export const metadata: Metadata = {
  title: "นักเรียน · chumkosoft",
};

export const dynamic = "force-dynamic";

const FILTERS: ("all" | EnrolmentStatus)[] = ["all", "active", "pending", "leave"];

interface StudentsPageProps {
  searchParams: Promise<{ page?: string; q?: string; filter?: string }>;
}

export default async function StudentsPage({ searchParams }: StudentsPageProps): Promise<React.ReactNode> {
  const params = await searchParams;
  const query = params.q ?? "";
  const filter = FILTERS.includes(params.filter as EnrolmentStatus) ? (params.filter as "all" | EnrolmentStatus) : "all";
  const [result, classrooms, stats] = await Promise.all([
    listStudentsPaginated({ page: parsePage(params.page), search: query, filter }),
    listClassroomOptions(),
    getStudentStats(),
  ]);

  return (
    <>
      <PageHeader
        title="นักเรียน"
        subtitle={`ทะเบียนนักเรียนทั้งหมด ${stats.total.toLocaleString("th-TH")} คน · ปีการศึกษา 2568`}
      />
      <StatStrip
        items={[
          { label: "นักเรียนทั้งหมด", value: stats.total, hint: "คน", icon: GraduationCap, tone: "brand" },
          { label: "กำลังศึกษา", value: stats.active, hint: "คน", icon: CircleCheck, tone: "success" },
          { label: "รออนุมัติ", value: stats.pending, hint: "คน", icon: Clock, tone: "warning" },
          { label: "ลาพัก", value: stats.leave, hint: "คน", icon: PauseCircle, tone: "default" },
        ]}
      />
      <StudentsBrowser page={result} query={query} filter={filter} classrooms={classrooms} />
    </>
  );
}
