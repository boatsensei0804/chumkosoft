import type { Metadata } from "next";
import { BookOpen, CircleCheck, CircleDashed } from "lucide-react";
import PageHeader from "@/features/dashboard/components/page-header";
import StatStrip from "@/components/ui/stat-strip";
import CoursesBrowser from "@/features/courses/components/courses-browser";
import { listCoursesPaginated, getCourseStats } from "@/services/course-service";
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
  const [result, stats] = await Promise.all([listCoursesPaginated({ page: parsePage(params.page), search: query }), getCourseStats()]);

  return (
    <>
      <PageHeader
        title="รายวิชา"
        subtitle={`หลักสูตรทั้งหมด ${stats.total.toLocaleString("th-TH")} วิชา · ปีการศึกษา 2568`}
      />
      <StatStrip
        items={[
          { label: "รายวิชาทั้งหมด", value: stats.total, hint: "วิชา", icon: BookOpen, tone: "brand" },
          { label: "เปิดสอนแล้ว", value: stats.open, hint: "วิชา", icon: CircleCheck, tone: "success" },
          { label: "ยังไม่เปิดสอน", value: stats.total - stats.open, hint: "วิชา", icon: CircleDashed, tone: "default" },
        ]}
      />
      <CoursesBrowser page={result} query={query} />
    </>
  );
}
