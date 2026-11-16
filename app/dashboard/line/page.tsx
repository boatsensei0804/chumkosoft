import LineDeliveryPanel from "@/features/line/components/line-delivery-panel";
import { formatLinkPercentage, lineLinkPercentage } from "@/features/line/line-link-report";
import LineWorkspace from "@/features/line/components/line-workspace";
import type { Metadata } from "next";
import Link from "next/link";
import { UsersRound, CircleCheck, Clock, CircleMinus } from "lucide-react";
import PageHeader from "@/features/dashboard/components/page-header";
import StatStrip from "@/components/ui/stat-strip";
import LineManager from "@/features/line/components/line-manager";
import LineClassroomOverview from "@/features/line/components/line-classroom-overview";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
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
  const user = await requireRoles(STAFF_ROLES);
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

  return (
    <>
      <PageHeader
        title="LINE / แจ้งเตือนผู้ปกครอง"
        subtitle="ผูกบัญชี LINE ของผู้ปกครองเข้ากับนักเรียน เพื่อส่งแจ้งเตือนอัตโนมัติเมื่อนักเรียนเข้าโรงเรียน"
        actions={<div className="flex flex-wrap gap-2"><Link href="/dashboard/line/report" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">สรุปเปอร์เซ็นต์ / ส่งออกรายห้อง</Link>{user.role === "ADMIN" && <><Link href="/dashboard/line/messages" className="rounded-lg border border-line bg-card px-4 py-2 text-sm font-semibold text-brand-ink">ประวัติ / โควตา LINE</Link><Link href="/dashboard/line/teachers" className="rounded-lg border border-line bg-card px-4 py-2 text-sm font-semibold text-brand-ink">ดูสถานะ LINE ครู</Link><Link href="/dashboard/line-announcements" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">ส่งประกาศ LINE</Link></>}</div>}
      />
      <LineDeliveryPanel canManage={user.role === "ADMIN"} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-white px-5 py-4"><p className="text-sm text-muted">ผูก LINE แล้ว <strong className="text-2xl text-brand-ink">{formatLinkPercentage(lineLinkPercentage(stats.linked, stats.total))}</strong> · {stats.linked}/{stats.total} คนในขอบเขตที่เลือก</p><Link href={`/dashboard/line/report${classroomId ? `?classroom=${encodeURIComponent(classroomId)}` : ""}`} className="min-h-10 py-2 text-sm font-semibold text-brand-ink">ดูรายชื่อ รหัส และส่งออก →</Link></div>
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
