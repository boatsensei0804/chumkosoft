import type { Metadata } from "next";
import PageHeader from "@/features/dashboard/components/page-header";
import CoursesBrowser from "@/features/courses/components/courses-browser";
import { listCoursesPaginated } from "@/services/course-service";
import { parsePage } from "@/types/pagination";

export const metadata: Metadata = {
  title: "รายวิชา · chumkosoft",
};

export const dynamic = "force-dynamic";

interface CoursesPageProps {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function CoursesPage({ searchParams }: CoursesPageProps): Promise<React.ReactNode> {
  const params = await searchParams;
  const query = params.q ?? "";
  const result = await listCoursesPaginated({ page: parsePage(params.page), search: query });

  return (
    <>
      <PageHeader
        title="รายวิชา"
        subtitle={`หลักสูตรทั้งหมด ${result.total.toLocaleString("th-TH")} วิชา · ปีการศึกษา 2568`}
      />
      <CoursesBrowser page={result} query={query} />
    </>
  );
}
