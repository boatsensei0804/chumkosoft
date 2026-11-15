import type { Metadata } from "next";
import PageHeader from "@/features/dashboard/components/page-header";
import StudentsBrowser from "@/features/dashboard/components/students-browser";
import StudentOverviewPanel from "@/features/students/components/student-overview";
import { getStudentsWorkspace } from "@/services/student-service";
import { parsePage } from "@/types/pagination";
import type { EnrolmentStatus } from "@/features/dashboard/types";
import type { StudentGender } from "@/features/students/overview";
import { requireRoles } from "@/lib/dal";
export const metadata: Metadata = { title: "นักเรียน · chumkosoft" };
export const dynamic = "force-dynamic";
export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; filter?: string; classroom?: string; gender?: string; grade?: string }> }): Promise<React.ReactNode> {
  await requireRoles(["ADMIN", "TEACHER"]);
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const filter = ["active", "pending", "leave"].includes(params.filter ?? "") ? params.filter as EnrolmentStatus : "all";
  const gender = ["male", "female", "other"].includes(params.gender ?? "") ? params.gender as StudentGender : "all";
  const classroom = typeof params.classroom === "string" ? params.classroom.slice(0, 150) : "";
  const grade = typeof params.grade === "string" ? params.grade.slice(0, 100) : "";
  const result = await getStudentsWorkspace({ page: parsePage(params.page), search: query, filter, classroom, gender, grade });
  return <>
    <PageHeader title="นักเรียน" subtitle={`ทะเบียน ${result.overview.overall.total.toLocaleString("th-TH")} คน · ${result.overview.term ?? "ยังไม่มีภาคเรียนปัจจุบัน"}`} />
    <StudentOverviewPanel overview={result.overview} classroom={classroom} />
    <div className="mt-6"><StudentsBrowser key={JSON.stringify([query, filter, classroom, gender, grade])} page={result.page} query={query} filter={filter} classrooms={result.classrooms} classroom={classroom} gender={gender} grade={grade} grades={result.overview.grades} /></div>
  </>;
}
