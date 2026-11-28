import LineDeliveryPanel from "@/features/line/components/line-delivery-panel";
import { formatLinkPercentage, lineLinkPercentage } from "@/features/line/line-link-report";
import LineWorkspace from "@/features/line/components/line-workspace";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Bell, ChartNoAxesColumnIncreasing, CircleCheck, CircleMinus, Clock, History, Megaphone, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/features/dashboard/components/page-header";
import StatStrip from "@/components/ui/stat-strip";
import LineManager from "@/features/line/components/line-manager";
import LineClassroomOverview from "@/features/line/components/line-classroom-overview";
import { requireRoles } from "@/lib/dal";
import { listStudentGuardians, listGuardianClassrooms, getStudentLineStats, listClassroomLineStats } from "@/features/guardians/services/guardian-service";
import type { StudentLineFilter } from "@/features/guardians/repositories/guardian-repository";
import { isLineConfigured } from "@/lib/line";
import { parsePage } from "@/types/pagination";

export const metadata: Metadata = {
  title: "LINE / แจ้งเตือน · chumkosoft",
};

export const dynamic = "force-dynamic";

interface LinePageProps {
  searchParams: Promise<{ page?: string; q?: string; classroom?: string; filter?: string }>;
}

export default async function LinePage({ searchParams }: LinePageProps): Promise<React.ReactNode> {
  await requireRoles(["ADMIN"]);
  const params = await searchParams;
  const query = params.q ?? "";
  const classroomId = params.classroom ?? "";
  const filter: StudentLineFilter | "all" = params.filter === "linked" || params.filter === "pending" || params.filter === "unprepared" ? params.filter : "all";
  const [result, classrooms, stats, roomStats] = await Promise.all([
    listStudentGuardians({ page: parsePage(params.page), search: query, classroomId: classroomId || undefined, includeLineProfiles: true, lineFilter: filter === "all" ? undefined : filter, currentTermOnly: true }),
    listGuardianClassrooms(),
    getStudentLineStats({ search: query, classroomId: classroomId || undefined, currentTermOnly: true }),
    listClassroomLineStats(),
  ]);

  const reportHref = `/dashboard/line/report?${new URLSearchParams({ classroom: classroomId || "all" })}`;
  const tasks = [
    { href: "/dashboard/line/messages", label: "ประวัติการส่ง", icon: History },
    { href: "/dashboard/settings?section=notifications", label: "ตั้งเวลาแจ้งเตือน", icon: Bell },
    { href: "/dashboard/line/teachers", label: "สถานะ LINE ครู", icon: UsersRound },
    { href: reportHref, label: "สรุปและส่งออกรายห้อง", icon: ChartNoAxesColumnIncreasing },
  ];

  return (
    <>
      <PageHeader
        compact
        pose="family"
        title="การแจ้งเตือน LINE"
        subtitle="ดูการเชื่อมบัญชีผู้ปกครอง ติดตามผลการส่ง และตั้งเวลาสรุปให้ครู"
        actions={<Button asChild className="h-11"><Link href="/dashboard/line-announcements"><Megaphone aria-hidden="true" />ส่งประกาศ</Link></Button>}
      />
      <nav aria-label="งาน LINE" className="mb-5 grid grid-cols-2 divide-line overflow-hidden rounded-xl border border-line bg-card lg:grid-cols-4">
        {tasks.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex min-h-13 items-center gap-2 border-line px-3 py-2 text-sm font-semibold text-brand-ink even:border-l nth-[n+3]:border-t hover:bg-brand-soft focus-visible:-outline-offset-2 sm:px-4 lg:border-l lg:first:border-l-0 lg:nth-[n+3]:border-t-0">
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">{label}</span>
            <ArrowUpRight aria-hidden="true" className="hidden size-4 shrink-0 text-muted sm:block" />
          </Link>
        ))}
      </nav>
      <LineDeliveryPanel canManage />
      <section aria-labelledby="guardian-line-heading" className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="guardian-line-heading" className="text-lg font-bold text-ink-strong">บัญชี LINE ผู้ปกครอง</h2>
          <p className="mt-1 text-sm text-muted">เชื่อมแล้ว <strong className="font-semibold text-brand-ink">{formatLinkPercentage(lineLinkPercentage(stats.linked, stats.total))}</strong> · {stats.linked}/{stats.total} คนในขอบเขตที่เลือก</p>
        </div>
      </section>
      <StatStrip
        items={[
          { label: "นักเรียนในรายการ", value: stats.total, hint: "คน", icon: UsersRound, tone: "brand" },
          { label: "มี LINE เชื่อมแล้ว", value: stats.linked, hint: "คน", icon: CircleCheck, tone: "success" },
          { label: "มีรหัสรอผูก", value: stats.pending, hint: "คน", icon: Clock, tone: "warning" },
          { label: "ยังไม่มีรหัส", value: stats.unprepared, hint: "คน", icon: CircleMinus, tone: "default" },
        ]}
      />
      <p className="mb-5 text-xs text-muted">ตัวเลขด้านบนนับนักเรียนคนละ 1 ครั้งตามห้องและคำค้นที่เลือก แม้นักเรียนจะมีผู้ปกครองเชื่อม LINE หลายบัญชี</p>
      <LineWorkspace key={`${classroomId}:${query}:${filter}:${result.page}`} initialView={classroomId || query || filter !== "all" || params.page ? "accounts" : "overview"}
        overview={<LineClassroomOverview rooms={roomStats} selectedId={classroomId} />}
        accounts={<LineManager page={result} query={query} configured={isLineConfigured()} classrooms={classrooms} classroomId={classroomId} filter={filter} />}
      />
    </>
  );
}
