import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import PageHeader from "@/features/dashboard/components/page-header";
import StatStrip from "@/components/ui/stat-strip";
import MascotEmptyState from "@/components/ui/mascot-empty-state";
import SemanticStatusBadge from "@/components/ui/semantic-status-badge";
import prisma from "@/lib/prisma";
import { requireRoles } from "@/lib/dal";
import { acknowledgeEmergencyAction, resolveEmergencyAction } from "@/features/faces/emergency-actions";
import RetryEmergencyMessageButton from "@/features/faces/components/retry-emergency-message-button";
import { getLineDeliveryState } from "@/features/line/services/line-delivery-settings";

export const metadata: Metadata = { title: "แจ้งเหตุฉุกเฉิน · chumkosoft" };
export const dynamic = "force-dynamic";

const STATUS = {
  OPEN: { label: "รอรับเรื่อง", tone: "danger" },
  ACKNOWLEDGED: { label: "รับเรื่องแล้ว", tone: "warning" },
  RESOLVED: { label: "ดำเนินการแล้ว", tone: "success" },
} as const;

export default async function EmergencyIncidentsPage(): Promise<React.ReactNode> {
  await requireRoles(["ADMIN", "TEACHER"]);
  const [incidents, lineDelivery, statusCounts] = await Promise.all([
    prisma.emergencyIncident.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        acknowledgedBy: { select: { email: true } },
        resolvedBy: { select: { email: true } },
        lineMessages: { where: { status: "FAILED" }, orderBy: { createdAt: "desc" }, select: { id: true, recipientLabel: true, errorCode: true, attempts: true, createdAt: true } },
      },
    }),
    getLineDeliveryState(),
    prisma.emergencyIncident.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countFor = (status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED") => statusCounts.find((item) => item.status === status)?._count._all ?? 0;

  return <div className="xl:flex xl:h-full xl:min-h-0 xl:flex-col">
    <PageHeader title="แจ้งเหตุฉุกเฉิน" subtitle="เหตุจากแอปจุดสแกน · ติดตามผู้รับเรื่องและการแจ้งเตือน LINE" />
    <div role="note" className="mb-3 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-[#743145]">
      <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div><p className="font-bold">เหตุฉุกเฉินต้องติดต่อเจ้าหน้าที่หรือโทรศัพท์ทันที</p><p className="mt-0.5 leading-5">LINE ส่งถึงแอดมินและครูที่เชื่อมบัญชีไว้เท่านั้น{!lineDelivery.available || !lineDelivery.enabled ? " · ขณะนี้พักการส่ง LINE: เหตุใหม่ยังถูกบันทึกบนเว็บ" : " · หากออฟไลน์หรือไม่มีผู้รับ ให้ใช้ช่องทางฉุกเฉินของโรงเรียน"}</p></div>
    </div>
    <StatStrip className="mb-3 !grid-cols-1 sm:!grid-cols-3" items={[
      { label: "รอรับเรื่อง", value: countFor("OPEN"), icon: AlertTriangle, tone: "danger" },
      { label: "รับเรื่องแล้ว", value: countFor("ACKNOWLEDGED"), icon: Clock3, tone: "warning" },
      { label: "ดำเนินการแล้ว", value: countFor("RESOLVED"), icon: CheckCircle2, tone: "success" },
    ]} />
    <section aria-label="รายการแจ้งเหตุ" className="min-h-0 flex-1 overflow-y-auto rounded-[22px] border border-blue-100 bg-white p-3 shadow-[0_8px_24px_#225a9a0d] sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-base font-bold text-ink-strong">รายการแจ้งเหตุ</h2><p className="text-xs text-muted">แสดง {incidents.length} รายการ · เหตุรอรับเรื่องอยู่ด้านบน</p></div>
      {incidents.length ? <div className="space-y-3">{incidents.map((incident) => <article key={incident.id} className="rounded-2xl border border-blue-100 bg-[#fbfdff] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-ink-strong">{incident.category}</h3><SemanticStatusBadge tone={STATUS[incident.status].tone}>{STATUS[incident.status].label}</SemanticStatusBadge></div><p className="mt-1 text-sm text-muted">จุดแจ้งเหตุ: {incident.deviceNameSnapshot}</p><time className="mt-1 block text-xs text-muted" dateTime={incident.createdAt.toISOString()}>{new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(incident.createdAt)} น.</time></div>
          {incident.status !== "RESOLVED" && <div className="flex flex-wrap gap-2">{incident.status === "OPEN" && <form action={acknowledgeEmergencyAction.bind(null, incident.id)}><button className="min-h-10 rounded-xl border border-blue-200 bg-white px-3 text-sm font-semibold text-brand-ink hover:bg-blue-50">รับเรื่อง</button></form>}<form action={resolveEmergencyAction.bind(null, incident.id)}><button className="min-h-10 rounded-xl bg-[#1769b3] px-3 text-sm font-semibold text-white hover:bg-[#0b4385]">ปิดเหตุ</button></form></div>}
        </div>
        {incident.detail && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-blue-50/70 p-3 text-sm text-ink">{incident.detail}</p>}
        {incident.lineMessages.length > 0 && <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3"><p className="mb-2 text-sm font-semibold text-rose-800">LINE ส่งไม่สำเร็จ {incident.lineMessages.length} บัญชี · ส่งซ้ำรายบัญชีได้</p><div className="space-y-2">{incident.lineMessages.map((message) => <div key={message.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-2"><span className="text-sm text-ink">{message.recipientLabel ?? "บัญชี LINE"} · {message.errorCode ?? "ไม่ทราบสาเหตุ"} · ลองแล้ว {message.attempts} ครั้ง</span><RetryEmergencyMessageButton id={message.id} /></div>)}</div></div>}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-blue-100 pt-3 text-xs text-muted"><span>LINE เป้าหมาย {incident.lineTargetCount} บัญชี</span><span className="text-emerald-700">LINE รับคำขอ {incident.lineAcceptedCount}</span>{incident.lineFailedCount > 0 && <span className="text-rose-700">ส่งไม่สำเร็จ {incident.lineFailedCount}</span>}{incident.lineTargetCount === 0 && <span className="text-rose-700">ยังไม่มีบัญชี LINE แอดมิน/ครูที่เชื่อมไว้</span>}{incident.acknowledgedBy && <span>รับเรื่องโดย {incident.acknowledgedBy.email}</span>}{incident.status === "RESOLVED" && incident.resolvedBy && <span>ปิดเหตุโดย {incident.resolvedBy.email}</span>}</div>
      </article>)}</div> : <MascotEmptyState compact pose="empty" title="ยังไม่มีรายการแจ้งเหตุ" description="เมื่อมีเหตุจากจุดสแกน รายการจริงจะปรากฏที่นี่" className="min-h-52" />}
    </section>
  </div>;
}
