import type { Metadata } from "next";
import PageHeader from "@/features/dashboard/components/page-header";
import StudentsBrowser from "@/features/dashboard/components/students-browser";
import { listStudentsPaginated, listClassroomOptions } from "@/services/student-service";
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
  const [result, classrooms] = await Promise.all([
    listStudentsPaginated({ page: parsePage(params.page), search: query, filter }),
    listClassroomOptions(),
  ]);

  return (
    <>
      <PageHeader
        title="นักเรียน"
        subtitle={`ทะเบียนนักเรียนทั้งหมด ${result.total.toLocaleString("th-TH")} คน · ปีการศึกษา 2568`}
      />
      <StudentsBrowser page={result} query={query} filter={filter} classrooms={classrooms} />
    </>
  );
}
