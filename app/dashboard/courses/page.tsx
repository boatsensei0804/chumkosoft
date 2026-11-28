import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen, CircleCheck, CircleDashed } from "lucide-react";
import PageHeader from "@/features/dashboard/components/page-header";
import StatStrip from "@/components/ui/stat-strip";
import CoursesBrowser from "@/features/courses/components/courses-browser";
import { listCoursesPaginated, getCourseStats } from "@/services/course-service";
import { parsePage } from "@/types/pagination";
import { getActiveTermLabel } from "@/services/dashboard-service";
import { requireRoles } from "@/lib/dal";

export const metadata: Metadata = {
  title: "รายวิชา · chumkosoft",
};

export const dynamic = "force-dynamic";

interface CoursesPageProps {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function CoursesPage({ searchParams }: CoursesPageProps): Promise<React.ReactNode> {
  const user = await requireRoles(["ADMIN", "TEACHER"]);
  const params = await searchParams;
  const query = params.q ?? "";
  const [result, stats, termLabel] = await Promise.all([
    listCoursesPaginated({ page: parsePage(params.page), search: query }),
    getCourseStats(),
    getActiveTermLabel(),
  ]);

  return (
    <div className="xl:flex xl:h-full xl:min-h-0 xl:flex-col">
      <PageHeader pose="learning"
        title="รายวิชา"
        actions={user.role === "ADMIN" && <Link href="/dashboard/classrooms" className="inline-flex min-h-10 items-center rounded-xl border border-line bg-white px-3 text-sm font-semibold text-brand-ink">เปิดสอนรายวิชาให้ห้องเรียน</Link>}
        subtitle={`หลักสูตรทั้งหมด ${stats.total.toLocaleString("th-TH")} วิชา · ${termLabel}`}
      />
      {stats.total > 0 && <StatStrip
        items={[
          { label: "รายวิชาทั้งหมด", value: stats.total, hint: "วิชา", icon: BookOpen, tone: "brand" },
          { label: "เปิดสอนแล้ว", value: stats.open, hint: "วิชา", icon: CircleCheck, tone: "success" },
          { label: "ยังไม่เปิดสอน", value: stats.total - stats.open, hint: "วิชา", icon: CircleDashed, tone: "default" },
        ]}
      />}
      <CoursesBrowser page={result} query={query} canManage={user.role === "ADMIN"} />
    </div>
  );
}
